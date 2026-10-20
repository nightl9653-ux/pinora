import { addDays, dayIndex, EPOCH, isIsoDate } from "../src/game/dates";
import { CATEGORIES, type Category, type Difficulty } from "../src/game/locale";
import { facts } from "./data/facts";
import { placeById } from "./data/places";
import type { Fact } from "./data/types";

const cache = new Map<string, Fact[]>();
let builtUntil = "";

function hash(text: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

function rotate<T>(items: readonly T[], offset: number): T[] {
  const size = items.length;
  const start = ((offset % size) + size) % size;
  return [...items.slice(start), ...items.slice(0, start)];
}

const LEADERS = ["film", "music", "city", "history"] as const;

function targetsFor(date: string): { category: Category; target: Difficulty }[] {
  const index = dayIndex(date);
  const leader = LEADERS[index % LEADERS.length];
  const rest = rotate(
    CATEGORIES.filter((category) => category !== leader),
    index % 4,
  );
  return [leader, ...rest].map((category, slot) => ({
    category,
    target: (slot + 1) as Difficulty,
  }));
}

function recentIds(date: string, days: number): Set<string> {
  const ids = new Set<string>();
  for (let back = 1; back <= days; back += 1) {
    const prev = addDays(date, -back);
    if (prev < EPOCH) break;
    for (const fact of cache.get(prev) ?? []) ids.add(fact.id);
  }
  return ids;
}

function poolFor(
  category: Category,
  target: Difficulty,
  relax: number,
  blocked: Set<string>,
): Fact[] {
  let pool = facts.filter((fact) => fact.category === category);
  if (relax <= 1) {
    const exact = pool.filter((fact) => fact.difficulty === target);
    if (exact.length > 0) pool = exact;
  } else if (relax === 2) {
    const near = pool.filter((fact) => Math.abs(fact.difficulty - target) <= 1);
    if (near.length > 0) pool = near;
  }
  if (relax === 0 || relax === 2) {
    const fresh = pool.filter((fact) => !blocked.has(fact.id));
    if (fresh.length > 0) pool = fresh;
  }
  return pool;
}

function pickDay(date: string): Fact[] {
  const needs = targetsFor(date);
  const blocked = recentIds(date, 5);

  function attempt(relax: number, uniqueCountry: boolean): Fact[] | null {
    const usedPlaces = new Set<string>();
    const usedCountries = new Set<string>();
    const usedContinents = new Set<string>();

    function ordered(pool: Fact[]): Fact[] {
      return [...pool].sort((a, b) => {
        const pa = placeById(a.placeId);
        const pb = placeById(b.placeId);
        const sa =
          (usedContinents.has(pa.continent) ? 0 : 8) + (blocked.has(a.id) ? 0 : 2);
        const sb =
          (usedContinents.has(pb.continent) ? 0 : 8) + (blocked.has(b.id) ? 0 : 2);
        if (sb !== sa) return sb - sa;
        return hash(`${date}:${a.id}`) - hash(`${date}:${b.id}`);
      });
    }

    function walk(index: number): Fact[] | null {
      if (index === needs.length) return [];
      const need = needs[index];
      const choices = ordered(poolFor(need.category, need.target, relax, blocked))
        .filter((fact) => {
          const place = placeById(fact.placeId);
          if (usedPlaces.has(place.id)) return false;
          if (uniqueCountry && usedCountries.has(place.country)) return false;
          return true;
        })
        .slice(0, 7);
      for (const fact of choices) {
        const place = placeById(fact.placeId);
        usedPlaces.add(place.id);
        usedCountries.add(place.country);
        usedContinents.add(place.continent);
        const rest = walk(index + 1);
        if (rest) return [fact, ...rest];
        usedPlaces.delete(place.id);
        usedCountries.delete(place.country);
        usedContinents.delete(place.continent);
      }
      return null;
    }

    return walk(0);
  }

  for (const uniqueCountry of [true, false]) {
    for (const relax of [0, 1, 2, 3]) {
      const found = attempt(relax, uniqueCountry);
      if (found) {
        return [...found].sort(
          (a, b) => a.difficulty - b.difficulty || hash(`${date}:${a.id}`) - hash(`${date}:${b.id}`),
        );
      }
    }
  }
  throw new Error(`no puzzle for ${date}`);
}

export function puzzleFor(date: string): Fact[] {
  if (!isIsoDate(date) || date < EPOCH) throw new Error(`undated ${date}`);
  if (!cache.has(date)) {
    let cursor = builtUntil ? addDays(builtUntil, 1) : EPOCH;
    if (cursor > date) cursor = EPOCH;
    while (cursor <= date) {
      if (!cache.has(cursor)) cache.set(cursor, pickDay(cursor));
      cursor = addDays(cursor, 1);
    }
    builtUntil = builtUntil && builtUntil > date ? builtUntil : date;
  }
  return cache.get(date) ?? [];
}
