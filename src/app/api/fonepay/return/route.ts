import { NextResponse } from "next/server";
import { handleFonepayReturn } from "@/server/payments";

/**
 * Fonepay's return redirect — the one callback that must not be missed.
 *
 * Fonepay's verification API only answers with the UID/BID this redirect
 * carries; there is no cold lookup by our reference alone. The handler stores
 * them before anything that can fail, so even a crash here leaves the
 * reconciliation cron able to finish the job.
 */
export const runtime = "nodejs"; // node:crypto for the HMAC. Never Edge.
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  try {
    const { redirectTo } = await handleFonepayReturn(new URL(req.url).searchParams);
    return NextResponse.redirect(redirectTo, 303);
  } catch (error) {
    console.error("[fonepay] return handler failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(`${site.replace(/\/+$/, "")}/`, 303);
  }
}

export const GET = handle;
export const POST = handle;
