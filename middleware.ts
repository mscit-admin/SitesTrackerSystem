import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/auth.ts. (Can't import lib/auth here —
// it pulls Prisma/bcrypt into the edge runtime.)
const SESSION_COOKIE = "__Host-gsdn_session";

// Edge-level gate: only checks for the presence of a session cookie. Real
// validation (expiry, idle timeout, active user) happens server-side in
// getCurrentUser(); the root layout sends invalid sessions to /logout.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isPublic = pathname === "/login" || pathname === "/logout";

  // expose the path to server components (for the central auth guard)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (hasSession && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return pass();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.).*)"],
};
