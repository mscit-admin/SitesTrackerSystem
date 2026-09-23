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

  // Use RELATIVE Location headers so redirects stay on the public host even when
  // the app sits behind a reverse proxy (the internal request URL is localhost).
  if (!hasSession && !isPublic) {
    return new NextResponse(null, { status: 307, headers: { Location: `/login?next=${encodeURIComponent(pathname)}` } });
  }
  if (hasSession && pathname === "/login") {
    return new NextResponse(null, { status: 307, headers: { Location: "/" } });
  }
  return pass();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.).*)"],
};
