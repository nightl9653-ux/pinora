import type { Category } from "./game/locale";
import type { Tier } from "./game/tier";

export type Solved = {
  index: number;
  accuracy: number;
  points: number;
  distanceKm: number;
  tier: Tier;
  placeName: string;
  story: string;
  lat: number;
  lng: number;
  guessLat: number;
  guessLng: number;
};

export type Puzzle = {
  date: string;
  today: string;
  reset: string;
  stakes: number[];
  name: string;
  questions: {
    index: number;
    category: Category;
    clue: string;
    stake: number;
    difficulty: number;
  }[];
  solved: Solved[];
  total: number;
  finished: boolean;
};

export type Board = {
  date: string;
  today: string;
  count: number;
  average: number | null;
  hardest: { index: number; category: Category; average: number } | null;
  top: { rank: number; name: string; total: number; tiers: Tier[]; you: boolean }[];
  you: { rank: number; name: string; total: number; tiers: Tier[] } | null;
};

async function read<T>(url: string, init?: RequestInit): Promise<T> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 20_000);
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...init,
      signal: control.signal,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchPuzzle(lang: string, date?: string): Promise<Puzzle> {
  const query = new URLSearchParams({ lang });
  if (date) query.set("date", date);
  return read(`/api/puzzle?${query}`);
}

export function fetchBoard(date: string): Promise<Board> {
  return read(`/api/board?date=${date}`);
}

export function sendGuess(date: string, index: number, lat: number, lng: number, lang: string) {
  return read<{ reveal: Solved; total: number; finished: boolean }>("/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, index, lat, lng, lang }),
  });
}

export function saveName(name: string): Promise<{ name: string }> {
  return read("/api/name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}
