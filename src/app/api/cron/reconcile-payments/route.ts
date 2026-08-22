import { isAuthorizedCron, reconcilePayments } from "@/server/payments";

/**
 * The primary confirmation channel for eSewa payments.
 *
 * ePay v2 has no reliable server-to-server notification — the IPN is one
 * sentence in the docs with no payload spec and no registration mechanism — so
 * this poll of the status API, not the browser redirect, is what actually
 * confirms money.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOBBY-PLAN LIMITATION — READ BEFORE RELYING ON THE SCHEDULE
 *
 * Correct reconciliation for payments is every 2–5 minutes. Vercel's Hobby plan
 * caps cron frequency at ONCE PER DAY, so `vercel.json` schedules the most it
 * allows and the daily run is a backstop, not the mechanism.
 *
 * **A 2–5 minute cadence requires Vercel Pro.** Until the project is upgraded,
 * three things carry the load, and all three are already in place:
 *
 *   1. The return handler confirms synchronously for every customer whose
 *      browser makes it back — the common case.
 *   2. The order-status page polls its own order while it is unresolved.
 *   3. This handler accepts `POST` with `Authorization: Bearer $CRON_SECRET`,
 *      so an admin "reconcile now" action can run it on demand. It is
 *      idempotent, bounded (50 attempts + 25 refund re-checks per run) and
 *      cheap, so calling it repeatedly is safe.
 *
 * Upgrading the plan is the fix; do not paper over it with a client-side timer.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request): Promise<Response> {
  if (!isAuthorizedCron(req)) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    const summary = await reconcilePayments();
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[esewa] reconcile cron failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ ok: false }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
