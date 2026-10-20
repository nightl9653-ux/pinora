import { NextResponse } from "next/server";
import { todayUtc } from "@/src/game/dates";
import { playerId, withCookie } from "@/server/identity";
import { loadStore } from "@/server/store";
import { boardView, playable } from "@/server/views";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? todayUtc();
  if (!playable(date)) {
    return NextResponse.json({ error: "date" }, { status: 400 });
  }
  const who = await playerId();
  const body = boardView(await loadStore(), date, who.id);
  const headers = withCookie(new Headers({ "Cache-Control": "no-store" }), who.setCookie);
  return NextResponse.json(body, { headers });
}
