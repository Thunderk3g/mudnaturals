import { NextResponse, type NextRequest } from "next/server";

/**
 * Outer gate for /admin. This runs on the Edge runtime, where node:crypto is
 * unavailable, so it can only check that a session cookie is *present* — the
 * signature is verified in `src/lib/admin-auth.ts`, which the console layout
 * and every admin Server Action call independently. Middleware is a second
 * layer here, never the only one.
 *
 * The cookie name is inlined rather than imported: importing admin-auth would
 * drag node:crypto into the Edge bundle and fail the build.
 */
const ADMIN_COOKIE = "mud_admin";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();
  if (request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();

  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = { matcher: "/admin/:path*" };
