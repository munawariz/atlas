// Shared-password auth. The password gate is the entire security boundary — there is no
// Supabase RLS and no per-user auth (ATLAS.md §5).
//
// NO `server-only` here on purpose: proxy.ts imports this and must stay Edge-safe.

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ft_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "COOKIE_SECRET is missing or too short. Set it to 32+ random bytes (hex) in .env.local."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload?.ok === true;
  } catch {
    return false;
  }
}

/**
 * Constant-time comparison against APP_PASSWORD.
 *
 * XOR the lengths first, then XOR every byte up to max(a.length, b.length) using `a[i] ?? 0`,
 * so neither the length nor the position of the first difference leaks through timing.
 */
export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;

  const a = new TextEncoder().encode(String(input ?? ""));
  const b = new TextEncoder().encode(expected);

  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
