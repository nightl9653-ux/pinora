import { NextResponse } from "next/server";
import { todayUtc } from "@/src/game/dates";
import { playerId, withCookie } from "@/server/identity";
import { ensurePlayer, getGuesses } from "@/server/store";
import { localeOf, playable, puzzleView } from "@/server/views";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const day = url.searchParams.get("date") ?? todayUtc();
  const lang = localeOf(url.searchParams.get("lang"));
  const who = await playerId();

  if (!playable(day)) {
    return NextResponse.json({ error: "date" }, { status: 400 });
  }

  const [name, guesses] = await Promise.all([ensurePlayer(who.id), getGuesses(day, who.id)]);
  const body = puzzleView(name, guesses, day, lang);
  const headers = withCookie(new Headers({ "Cache-Control": "no-store" }), who.setCookie);
  return NextResponse.json(body, { headers });
}
