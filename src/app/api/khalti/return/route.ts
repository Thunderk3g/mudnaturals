import { NextResponse } from "next/server";
import { handleKhaltiReturn } from "@/server/payments";

/**
 * Khalti's return redirect.
 *
 * The query carries a status, and it is ignored as authority: the handler looks
 * the payment up by the `pidx` we stored at initiation before anything is
 * confirmed. Nothing about the outcome travels onward in the URL — the browser
 * is sent to the order page, which reads its state from the database.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  try {
    const { redirectTo } = await handleKhaltiReturn(new URL(req.url).searchParams);
    return NextResponse.redirect(redirectTo, 303);
  } catch (error) {
    console.error("[khalti] return handler failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(`${site.replace(/\/+$/, "")}/`, 303);
  }
}

export const GET = handle;
export const POST = handle;
