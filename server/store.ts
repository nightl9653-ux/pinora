import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StoredGuess = {
  lat: number;
  lng: number;
  accuracy: number;
  distanceKm: number;
  points: number;
};

export type Store = {
  players: Record<string, { name: string }>;
  days: Record<string, Record<string, { guesses: StoredGuess[] }>>;
};

type GlobalPinora = typeof globalThis & {
  __pinoraMemory?: Store;
};

function empty(): Store {
  return { players: {}, days: {} };
}

function memoryStore(): Store {
  const g = globalThis as GlobalPinora;
  g.__pinoraMemory ??= empty();
  return g.__pinoraMemory;
}

function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadFromSupabase(client: SupabaseClient): Promise<Store> {
  const store = empty();
  const players = await client.from("pinora_players").select("id,name");
  if (players.error) throw players.error;
  for (const row of players.data ?? []) {
    store.players[row.id] = { name: row.name };
  }
  const rounds = await client.from("pinora_rounds").select("player_id,day,guesses");
  if (rounds.error) throw rounds.error;
  for (const row of rounds.data ?? []) {
    const day = String(row.day).slice(0, 10);
    store.days[day] ??= {};
    store.days[day][row.player_id] = {
      guesses: Array.isArray(row.guesses) ? (row.guesses as StoredGuess[]) : [],
    };
  }
  return store;
}

async function savePlayer(client: SupabaseClient, id: string, name: string): Promise<void> {
  const { error } = await client.from("pinora_players").upsert({ id, name });
  if (error) throw error;
}

async function saveRound(
  client: SupabaseClient,
  day: string,
  playerId: string,
  guesses: StoredGuess[],
): Promise<void> {
  const { error } = await client.from("pinora_rounds").upsert({
    player_id: playerId,
    day,
    guesses,
  });
  if (error) throw error;
}

export async function loadStore(): Promise<Store> {
  const client = supabase();
  if (!client) return structuredClone(memoryStore());
  return loadFromSupabase(client);
}

export async function updateStore(change: (store: Store) => void): Promise<Store> {
  const client = supabase();
  if (!client) {
    const store = memoryStore();
    change(store);
    return structuredClone(store);
  }

  const before = await loadFromSupabase(client);
  const store = structuredClone(before);
  change(store);

  for (const [id, player] of Object.entries(store.players)) {
    const prev = before.players[id];
    if (!prev || prev.name !== player.name) await savePlayer(client, id, player.name);
  }
  for (const [day, rows] of Object.entries(store.days)) {
    for (const [playerId, row] of Object.entries(rows)) {
      const prev = before.days[day]?.[playerId]?.guesses ?? [];
      if (JSON.stringify(prev) !== JSON.stringify(row.guesses)) {
        await saveRound(client, day, playerId, row.guesses);
      }
    }
  }
  return store;
}

export function usingSupabase(): boolean {
  return supabase() !== null;
}
