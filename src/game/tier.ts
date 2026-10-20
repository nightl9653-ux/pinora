export const STAKES = [100, 100, 200, 300, 300] as const;

export type Tier = "perfect" | "great" | "close" | "far" | "miss";

export function tierOf(accuracy: number): Tier {
  if (accuracy >= 100) return "perfect";
  if (accuracy >= 90) return "great";
  if (accuracy >= 50) return "close";
  if (accuracy >= 1) return "far";
  return "miss";
}

export function emojiFor(tier: Tier): string {
  if (tier === "miss") return "⚫️";
  if (tier === "far") return "🔴";
  if (tier === "close") return "🟡";
  return "🟢";
}

export function pointsFor(accuracy: number, index: number): number {
  return Math.round((accuracy * STAKES[index]) / 100);
}
