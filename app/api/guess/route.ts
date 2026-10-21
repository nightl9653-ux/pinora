import { NextResponse } from "next/server";
import { accuracyFromKm, distanceKm } from "@/src/game/score";
import { playerId, withCookie } from "@/server/identity";
import { defaultName, getGuesses, saveGuesses, type StoredGuess } from "@/server/store";
import { localeOf, playable, pointsFor, placeById, puzzleFor, puzzleView } from "@/server/views";

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
  // Skip ensurePlayer — reveal payload does not need the display name.
  const prior = await getGuesses(date, who.id);

  if (index !== prior.length || index >= round.length) {
    return NextResponse.json({ error: "order" }, { status: 409 });
  }

  const fact = round[index];
  const place = placeById(fact.placeId);
  const km = distanceKm(lat, lng, place.lat, place.lng);
  const accuracy = accuracyFromKm(km);
  const saved: StoredGuess = {
    lat,
    lng,
    accuracy,
    distanceKm: km,
    points: pointsFor(accuracy, index),
  };
  const guesses = [...prior, saved];
  await saveGuesses(date, who.id, guesses);

  const view = puzzleView(defaultName(who.id), guesses, date, locale);
  const headers = withCookie(new Headers({ "Cache-Control": "no-store" }), who.setCookie);
  return NextResponse.json(
    { reveal: view.solved[index], total: view.total, finished: view.finished },
    { headers },
  );
}
