import { EPOCH, isIsoDate, todayUtc } from "../src/game/dates";
import { isLocale, t, type Locale } from "../src/game/locale";
import { pointsFor, STAKES, tierOf, type Tier } from "../src/game/tier";
import { renderClue } from "./clue";
import { placeById, type Place } from "./data/places";
import type { Fact } from "./data/types";
import { puzzleFor } from "./select";
import { defaultName, type BoardRow, type StoredGuess } from "./store";

export { defaultName };

export function cleanName(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const name = raw.replace(/[\r\n\t<>]/g, "").trim().slice(0, 16);
  return name || fallback;
}

export function playable(date: string): boolean {
  return isIsoDate(date) && date >= EPOCH && date <= todayUtc();
}

export function localeOf(value: string | null): Locale {
  if (value && isLocale(value)) return value;
  return "en";
}

function placeLabel(place: Place, locale: Locale): string {
  const bag = place.reveal ?? place.names;
  const local = t(bag, locale);
  if (
    locale === "zh-Hans" ||
    locale === "zh-Hant" ||
    locale === "ja" ||
    locale === "ko" ||
    locale === "en"
  ) {
    return local;
  }
  const english = bag.en;
  if (local.toLowerCase() === english.toLowerCase()) return local;
  return `${local} · ${english}`;
}

function clueFor(fact: Fact, locale: Locale): string {
  if (fact.kind === "spell") {
    return t(fact.story, locale);
  }
  return renderClue(fact.kind, locale, t(fact.subject, locale));
}

export function solvedView(fact: Fact, guess: StoredGuess, index: number, locale: Locale) {
  const place = placeById(fact.placeId);
  return {
    index,
    accuracy: guess.accuracy,
    points: guess.points,
    distanceKm: Math.round(guess.distanceKm),
    tier: tierOf(guess.accuracy),
    placeName: placeLabel(place, locale),
    subject: t(fact.subject, locale),
    story: t(fact.story, locale),
    lat: place.lat,
    lng: place.lng,
    guessLat: guess.lat,
    guessLng: guess.lng,
  };
}

export function puzzleView(
  name: string,
  guesses: StoredGuess[],
  date: string,
  locale: Locale,
) {
  const round = puzzleFor(date);
  return {
    date,
    today: todayUtc(),
    reset: "00:00 UTC",
    stakes: [...STAKES],
    name,
    questions: round.map((fact, index) => ({
      index,
      category: fact.category,
      clue: clueFor(fact, locale),
      stake: STAKES[index],
      difficulty: fact.difficulty,
    })),
    solved: guesses.map((guess, index) => solvedView(round[index], guess, index, locale)),
    total: guesses.reduce((sum, guess) => sum + guess.points, 0),
    finished: guesses.length === round.length,
  };
}

export function boardView(rowsIn: BoardRow[], date: string, id: string) {
  const round = puzzleFor(date);
  const rows = rowsIn
    .filter((row) => row.guesses.length === 5)
    .map((row) => ({
      id: row.playerId,
      name: row.name || defaultName(row.playerId),
      total: row.guesses.reduce((sum, guess) => sum + guess.points, 0),
      tiers: row.guesses.map((guess) => tierOf(guess.accuracy)) as Tier[],
      accuracies: row.guesses.map((guess) => guess.accuracy),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  let hardest: { index: number; category: Fact["category"]; average: number } | null = null;
  if (rows.length > 0) {
    for (let index = 0; index < 5; index += 1) {
      const average = Math.round(
        rows.reduce((sum, row) => sum + row.accuracies[index], 0) / rows.length,
      );
      if (
        !hardest ||
        average < hardest.average ||
        (average === hardest.average && index > hardest.index)
      ) {
        hardest = { index, category: round[index].category, average };
      }
    }
  }

  const youIndex = rows.findIndex((row) => row.id === id);
  const you = youIndex >= 0 ? rows[youIndex] : null;
  return {
    date,
    today: todayUtc(),
    count: rows.length,
    average: rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.total, 0) / rows.length)
      : null,
    hardest,
    top: rows.slice(0, 50).map((row, index) => ({
      rank: index + 1,
      name: row.name,
      total: row.total,
      tiers: row.tiers,
      you: row.id === id,
    })),
    you: you
      ? { rank: youIndex + 1, name: you.name, total: you.total, tiers: you.tiers }
      : null,
  };
}

export { pointsFor, placeById, puzzleFor, STAKES };
