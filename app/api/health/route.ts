import { NextResponse } from "next/server";
import { todayUtc } from "@/src/game/dates";
import { usingSupabase } from "@/server/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    today: todayUtc(),
    store: usingSupabase() ? "supabase" : "memory",
  });
}
