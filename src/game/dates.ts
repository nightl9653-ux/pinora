export const EPOCH = "2026-01-01";

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const next = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  return new Date(next).toISOString().slice(0, 10);
}

export function isIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return todayUtc(new Date(`${iso}T00:00:00Z`)) === iso;
}

export function dayIndex(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${EPOCH}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
