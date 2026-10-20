import { addDays } from "./game/dates";

type Streak = { last: string; count: number };
const key = "pinora-streak";

function read(): Streak {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "") as Streak;
    if (parsed && typeof parsed.count === "number" && typeof parsed.last === "string") return parsed;
  } catch {
    /* empty */
  }
  return { last: "", count: 0 };
}

export function currentStreak(today: string): number {
  const state = read();
  if (state.last === today || state.last === addDays(today, -1)) return state.count;
  return 0;
}

export function rememberStreak(today: string, played: string): number {
  const state = read();
  if (played !== today) return currentStreak(today);
  if (state.last === today) return state.count;
  const count = state.last === addDays(today, -1) ? state.count + 1 : 1;
  localStorage.setItem(key, JSON.stringify({ last: today, count }));
  return count;
}
