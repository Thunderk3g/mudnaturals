import { NextResponse } from "next/server";
import { attemptIdFromUrl, handleEsewaReturn } from "@/server/payments";

/**
 * eSewa's success redirect.
 *
 * The browser lands here with the response base64-encoded in `?data=`. We verify
 * the HMAC, then call the status API with our *stored* uuid and amount before
 * anything is confirmed — a redirect is a user-agent navigation and proves
 * nothing on its own.
 *
 * Nothing about the outcome travels in the URL: we redirect to the order page,
 * which reads its state from the database.
 */
export const runtime = "nodejs"; // node:crypto for the HMAC. Never Edge.
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  try {
    const url = new URL(req.url);
    const { redirectTo } = await handleEsewaReturn({
      data: url.searchParams.get("data"),
      urlHint: attemptIdFromUrl(url.search),
    });
    return NextResponse.redirect(redirectTo, 303);
  } catch (error) {
    // A stack trace is never the right thing to show someone who just paid.
    console.error("[esewa] return handler failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(`${site.replace(/\/+$/, "")}/`, 303);
  }
}

export const GET = handle;
// Undocumented whether eSewa ever POSTs this callback; a 405 on a real payment
// is not worth the one line saved.
export const POST = handle;
