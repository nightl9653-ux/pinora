import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "pinora";

export async function playerId(): Promise<{ id: string; setCookie: string | null }> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) {
    return { id: existing, setCookie: null };
  }
  const id = randomBytes(16).toString("hex");
  return {
    id,
    setCookie: `${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
  };
}

export function withCookie(headers: Headers, setCookie: string | null): Headers {
  if (setCookie) headers.set("Set-Cookie", setCookie);
  return headers;
}
