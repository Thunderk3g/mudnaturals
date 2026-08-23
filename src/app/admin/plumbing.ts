import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/admin-auth";
import { humanError } from "@/server/admin";
import type { ActionState } from "./ui";

/**
 * Shared by every Server Action in the console.
 *
 * Deliberately not a "use server" module: a file with that directive may only
 * export async functions, which rules out the small synchronous form readers
 * below. Keeping them here means both action files share one definition of
 * "what a trimmed field is" and one definition of how a database error becomes
 * a sentence an operator can act on.
 */

export function isRedirect(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/** Re-verify → run → revalidate. Database errors come back as human sentences. */
export async function run(paths: string[], fn: () => Promise<string>): Promise<ActionState> {
  await requireSession(); // outside the try: its redirect must escape uncaught
  try {
    const ok = await fn();
    for (const path of paths) revalidatePath(path);
    return { ok };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: humanError(error) };
  }
}

export const text = (fd: FormData, key: string): string => {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export const optional = (fd: FormData, key: string): string | null => text(fd, key) || null;

export const number = (fd: FormData, key: string): number | null => {
  const raw = text(fd, key);
  return raw === "" ? null : Number(raw);
};

export const integer = (fd: FormData, key: string, fallback = 0): number => {
  const value = number(fd, key);
  return value != null && Number.isFinite(value) ? Math.round(value) : fallback;
};

export const flag = (fd: FormData, key: string): boolean => fd.get(key) != null;
