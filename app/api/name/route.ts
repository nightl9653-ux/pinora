import { NextResponse } from "next/server";
import { playerId, withCookie } from "@/server/identity";
import { updateStore } from "@/server/store";
import { cleanName, defaultName } from "@/server/views";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const who = await playerId();
  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  const name = cleanName(body.name, defaultName(who.id));
  await updateStore((store) => {
    store.players[who.id] = { name };
  });
  const headers = withCookie(new Headers({ "Cache-Control": "no-store" }), who.setCookie);
  return NextResponse.json({ name }, { headers });
}
