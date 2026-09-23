import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/auth.ts. (Can't import lib/auth here —
// it pulls Prisma/bcrypt into the edge runtime.)
const SESSION_COOKIE = "gsdn_session";

// Edge-level gate: only checks for the presence of a session cookie. Real
// validation (expiry, active user, permissions) happens server-side via
// getCurrentUser() / requirePermission().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals, uploaded files, and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.).*)"],
};
