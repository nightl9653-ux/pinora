import { NextResponse } from "next/server";
import { playerId, withCookie } from "@/server/identity";
import { defaultName, setPlayerName } from "@/server/store";
import { cleanName } from "@/server/views";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const who = await playerId();
  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  const name = cleanName(body.name, defaultName(who.id));
  await setPlayerName(who.id, name);
  const headers = withCookie(new Headers({ "Cache-Control": "no-store" }), who.setCookie);
  return NextResponse.json({ name }, { headers });
}
