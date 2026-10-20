import { addDays, EPOCH } from "../src/game/dates";
import { CATEGORIES } from "../src/game/locale";
import { STAKES } from "../src/game/tier";
import { accuracyFromKm, distanceKm } from "../src/game/score";
import { facts } from "./data/facts";
import { placeById } from "./data/places";
import { leakedLocales } from "./leak";
import { puzzleFor } from "./select";

const leaks: string[] = [];
for (const fact of facts) {
  const place = placeById(fact.placeId);
  const hit = leakedLocales(fact, place);
  if (hit.length > 0) leaks.push(`${fact.id} ${hit.join(", ")}`);
}
if (leaks.length > 0) {
  console.error(leaks.join("\n"));
  throw new Error("clue contains the answer");
}

const samples = [0, 30, 80, 150, 250, 500, 800, 1500, 3000, 6000, 10000, 19000];
let previous = 101;
for (const km of samples) {
  const score = accuracyFromKm(km);
  if (score > previous) throw new Error(`score rose at ${km}km (${score} > ${previous})`);
  previous = score;
}
if (accuracyFromKm(0) !== 100 || accuracyFromKm(30) !== 100) throw new Error("close tap should be perfect");
if (accuracyFromKm(20000) !== 0) throw new Error("antipode should be zero");
const romeNaples = distanceKm(41.9028, 12.4964, 40.8518, 14.2681);
const romeScore = accuracyFromKm(romeNaples);
if (romeScore < 70 || romeScore > 86) {
  throw new Error(`Rome vs Naples should be yellow, got ${romeScore} at ${Math.round(romeNaples)}km`);
}

const seenAt = new Map<string, number>();
let cursor = EPOCH;
for (let i = 0; i < 120; i += 1) {
  const round = puzzleFor(cursor);
  if (round.length !== 5) throw new Error(`${cursor} length`);
  const categories = new Set(round.map((fact) => fact.category));
  if (categories.size !== 5) throw new Error(`${cursor} categories`);
  for (const category of CATEGORIES) {
    if (!categories.has(category)) throw new Error(`${cursor} missing ${category}`);
  }
  const places = round.map((fact) => placeById(fact.placeId));
  if (new Set(places.map((place) => place.id)).size !== 5) throw new Error(`${cursor} place collision`);
  if (new Set(places.map((place) => place.country)).size !== 5) {
    throw new Error(`${cursor} country collision ${places.map((place) => place.country).join(",")}`);
  }
  for (let n = 1; n < round.length; n += 1) {
    if (round[n].difficulty < round[n - 1].difficulty) {
      throw new Error(`${cursor} difficulty order`);
    }
  }
  round.forEach((fact, index) => {
    const prior = seenAt.get(fact.id);
    if (prior !== undefined && i - prior < 4) {
      throw new Error(`${fact.id} repeated on ${cursor} after ${i - prior} days`);
    }
    seenAt.set(fact.id, i);
    if (STAKES[index] === undefined) throw new Error("stake");
  });
  cursor = addDays(cursor, 1);
}

const today = puzzleFor("2026-10-20");
console.log(
  today
    .map((fact, index) => `${STAKES[index]} ${fact.category} d${fact.difficulty} ${fact.placeId}`)
    .join("\n"),
);
console.log(`rome-naples ${Math.round(romeNaples)}km -> ${romeScore}`);
console.log(`facts ${facts.length}, days ok`);
