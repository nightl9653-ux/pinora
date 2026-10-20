import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StoredGuess = {
  lat: number;
  lng: number;
  accuracy: number;
  distanceKm: number;
  points: number;
};

export type BoardRow = {
  playerId: string;
  name: string;
  guesses: StoredGuess[];
};

type Memory = {
  players: Record<string, { name: string }>;
  days: Record<string, Record<string, { guesses: StoredGuess[] }>>;
};

type GlobalPinora = typeof globalThis & {
  __pinoraMemory?: Memory;
  __pinoraSupabase?: SupabaseClient | null;
};

function empty(): Memory {
  return { players: {}, days: {} };
}

function memory(): Memory {
  const g = globalThis as GlobalPinora;
  g.__pinoraMemory ??= empty();
  return g.__pinoraMemory;
}

function client(): SupabaseClient | null {
  const g = globalThis as GlobalPinora;
  if (g.__pinoraSupabase !== undefined) return g.__pinoraSupabase;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  g.__pinoraSupabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return g.__pinoraSupabase;
}

export function usingSupabase(): boolean {
  return client() !== null;
}

export function defaultName(id: string): string {
  return `p${id.slice(0, 4)}`;
}

export async function ensurePlayer(id: string): Promise<string> {
  const sb = client();
  if (!sb) {
    const store = memory();
    store.players[id] ??= { name: defaultName(id) };
    return store.players[id].name;
  }

  const existing = await sb.from("pinora_players").select("name").eq("id", id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.name) return existing.data.name as string;

  const name = defaultName(id);
  const { error } = await sb.from("pinora_players").upsert({ id, name });
  if (error) throw error;
  return name;
}

export async function setPlayerName(id: string, name: string): Promise<void> {
  const sb = client();
  if (!sb) {
    memory().players[id] = { name };
    return;
  }
  const { error } = await sb.from("pinora_players").upsert({ id, name });
  if (error) throw error;
}

export async function getGuesses(day: string, playerId: string): Promise<StoredGuess[]> {
  const sb = client();
  if (!sb) {
    return memory().days[day]?.[playerId]?.guesses ?? [];
  }
  const { data, error } = await sb
    .from("pinora_rounds")
    .select("guesses")
    .eq("day", day)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.guesses) ? (data.guesses as StoredGuess[]) : [];
}

export async function saveGuesses(
  day: string,
  playerId: string,
  guesses: StoredGuess[],
): Promise<void> {
  const sb = client();
  if (!sb) {
    const store = memory();
    store.days[day] ??= {};
    store.days[day][playerId] = { guesses };
    return;
  }
  const { error } = await sb.from("pinora_rounds").upsert({
    player_id: playerId,
    day,
    guesses,
  });
  if (error) throw error;
}

async function namesFor(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)];
  const out: Record<string, string> = {};
  if (unique.length === 0) return out;

  const sb = client();
  if (!sb) {
    const store = memory();
    for (const id of unique) out[id] = store.players[id]?.name ?? defaultName(id);
    return out;
  }

  const { data, error } = await sb.from("pinora_players").select("id,name").in("id", unique);
  if (error) throw error;
  for (const row of data ?? []) out[row.id] = row.name;
  for (const id of unique) out[id] ??= defaultName(id);
  return out;
}

/** Only rounds for one day — used by the leaderboard. */
export async function listDayRounds(day: string): Promise<BoardRow[]> {
  const sb = client();
  if (!sb) {
    const dayRows = memory().days[day] ?? {};
    const names = await namesFor(Object.keys(dayRows));
    return Object.entries(dayRows).map(([playerId, row]) => ({
      playerId,
      name: names[playerId] ?? defaultName(playerId),
      guesses: row.guesses,
    }));
  }

  const { data, error } = await sb
    .from("pinora_rounds")
    .select("player_id,guesses")
    .eq("day", day);
  if (error) throw error;

  const rows = (data ?? []).map((row) => ({
    playerId: row.player_id as string,
    guesses: Array.isArray(row.guesses) ? (row.guesses as StoredGuess[]) : [],
  }));
  const names = await namesFor(rows.map((row) => row.playerId));
  return rows.map((row) => ({
    ...row,
    name: names[row.playerId] ?? defaultName(row.playerId),
  }));
}
