import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep in sync with lib/auth.ts. (Can't import lib/auth here — it pulls
// Prisma/bcrypt into the edge runtime.)
const SESSION_COOKIE = "__Host-gsdn_session";
const MUSTCHANGE_COOKIE = "gsdn_mustchange";

// Edge-level gate: only checks for the presence of a session cookie. Real
// validation (expiry, idle timeout, active user) happens server-side in
// getCurrentUser(); the root layout sends invalid sessions to /logout.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Require a NON-EMPTY value: a cleared cookie can linger as an empty string,
  // and treating that as "logged in" would bounce the user in a redirect loop.
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = pathname === "/login" || pathname === "/logout";

  // expose the path to server components (for the central auth guard)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  // NextResponse.redirect needs an absolute URL; req.nextUrl already carries the
  // public host (nginx forwards Host $http_host), so this stays on the public host.
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
  // Force a password change: block every screen except the change page and logout.
  if (
    hasSession &&
    req.cookies.get(MUSTCHANGE_COOKIE)?.value === "1" &&
    pathname !== "/account/password" &&
    pathname !== "/logout"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/password";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return pass();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.).*)"],
};
