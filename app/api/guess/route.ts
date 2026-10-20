import { NextResponse } from "next/server";
import { accuracyFromKm, distanceKm } from "@/src/game/score";
import { playerId, withCookie } from "@/server/identity";
import { loadStore, updateStore, type StoredGuess } from "@/server/store";
import {
  defaultName,
  localeOf,
  playable,
  pointsFor,
  placeById,
  puzzleFor,
  puzzleView,
} from "@/server/views";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const who = await playerId();
  const body = (await request.json().catch(() => ({}))) as {
    date?: unknown;
    index?: unknown;
    lat?: unknown;
    lng?: unknown;
    lang?: unknown;
  };

  const date = typeof body.date === "string" ? body.date : "";
  const index = body.index;
  const lat = body.lat;
  const lng = body.lng;
  const locale = localeOf(typeof body.lang === "string" ? body.lang : null);

  if (!playable(date) || typeof index !== "number" || !Number.isInteger(index)) {
    return NextResponse.json({ error: "guess" }, { status: 400 });
  }
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: "point" }, { status: 400 });
  }

  const round = puzzleFor(date);
  let saved: StoredGuess | null = null;
  let conflict = false;

  await updateStore((store) => {
    store.players[who.id] ??= { name: defaultName(who.id) };
    store.days[date] ??= {};
    const row = store.days[date][who.id] ?? { guesses: [] };
    if (index !== row.guesses.length || index >= round.length) {
      conflict = true;
      return;
    }
    const fact = round[index];
    const place = placeById(fact.placeId);
    const km = distanceKm(lat, lng, place.lat, place.lng);
    const accuracy = accuracyFromKm(km);
    saved = {
      lat,
      lng,
      accuracy,
      distanceKm: km,
      points: pointsFor(accuracy, index),
    };
    row.guesses.push(saved);
    store.days[date][who.id] = row;
  });

  if (conflict || !saved) {
    return NextResponse.json({ error: "order" }, { status: 409 });
  }

  const view = puzzleView(await loadStore(), who.id, date, locale);
  const headers = withCookie(new Headers({ "Cache-Control": "no-store" }), who.setCookie);
  return NextResponse.json(
    { reveal: view.solved[index], total: view.total, finished: view.finished },
    { headers },
  );
}
