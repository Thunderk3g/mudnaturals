import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Admin auth, deliberately minimal: one shared password, no user table, no
 * Supabase Auth. A team of three does not need account management, and every
 * extra moving part here is another place to get authorization wrong.
 *
 * The cookie value is `<expiryMs>.<hmac(expiryMs)>` keyed by ADMIN_PASSWORD.
 * Nothing secret is stored in it, tampering fails the signature, and rotating
 * the password invalidates every live session for free.
 *
 * `src/middleware.ts` only checks that the cookie exists — it runs on the Edge
 * runtime where node:crypto does not exist. This module is the real check and
 * every Server Action calls `requireSession()` before touching the database.
 *
 * Node runtime only (`node:crypto`, `next/headers`). No `server-only` import so
 * the crypto here stays unit-testable; `next/headers` already makes the module
 * unusable from a Client Component, and ADMIN_PASSWORD is not NEXT_PUBLIC_, so
 * it can never reach the browser bundle.
 */

export const ADMIN_COOKIE = "mud_admin";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD is not set");
  return value;
}

function sign(expiresAt: number): string {
  return createHmac("sha256", secret()).update(String(expiresAt)).digest("hex");
}

/**
 * Timing-safe password check. Both sides are run through the same HMAC first so
 * the comparison is always over two equal-length digests — `timingSafeEqual`
 * throws on a length mismatch, which would itself leak the password length.
 */
export function passwordMatches(input: string): boolean {
  const key = secret();
  return timingSafeEqual(
    createHmac("sha256", key).update(input).digest(),
    createHmac("sha256", key).update(key).digest(),
  );
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;

  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = Buffer.from(sign(expiresAt), "hex");
  const given = Buffer.from(token.slice(dot + 1), "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function startSession(): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const store = await cookies();
  store.set(ADMIN_COOKIE, `${expiresAt}.${sign(expiresAt)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

/** Throws a redirect to the login screen unless the cookie signature is good. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/admin/login");
}
