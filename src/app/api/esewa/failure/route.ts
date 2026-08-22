import { NextResponse } from "next/server";
import { attemptIdFromUrl, handleEsewaFailure } from "@/server/payments";

/**
 * eSewa's failure redirect.
 *
 * The docs do not specify what this redirect carries, so `data` may be missing
 * or empty; the attempt id we appended to our own failure URL is the fallback,
 * scanned out of the raw query string because eSewa appends `?data=` without
 * checking for an existing one.
 *
 * A failure redirect is no more proof of failure than a success redirect is
 * proof of payment, so the status API still gets the last word: only when eSewa
 * agrees there is no completed payment does the attempt fail and its reserved
 * stock go back on the shelf.
 */
export const runtime = "nodejs"; // node:crypto for the HMAC. Never Edge.
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  try {
    const url = new URL(req.url);
    const { redirectTo } = await handleEsewaFailure({
      data: url.searchParams.get("data"),
      urlHint: attemptIdFromUrl(url.search),
    });
    return NextResponse.redirect(redirectTo, 303);
  } catch (error) {
    console.error("[esewa] failure handler failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(`${site.replace(/\/+$/, "")}/`, 303);
  }
}

export const GET = handle;
export const POST = handle;
