import { expireStaleAttempts, isAuthorizedCron } from "@/server/payments";

/**
 * Releases the stock held by payment attempts whose window has closed.
 *
 * Every attempt gets one last status check before it is expired: a payment that
 * completed while the customer's browser never came back would otherwise be
 * thrown away along with the order. eSewa has to agree there is nothing there.
 *
 * Same Hobby-plan caveat as `/api/cron/reconcile-payments`: **the daily schedule
 * in `vercel.json` is the most the Hobby plan allows, and a useful cadence needs
 * Vercel Pro.** The handler is idempotent and bounded, so it is safe to trigger
 * on demand with `POST` + `Authorization: Bearer $CRON_SECRET`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request): Promise<Response> {
  if (!isAuthorizedCron(req)) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    const summary = await expireStaleAttempts();
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[esewa] expire cron failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ ok: false }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
