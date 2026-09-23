import { destroyCurrentSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

// Clears the session row + cookie, then sends the user to the login screen.
// Uses a RELATIVE Location so the browser stays on the public host (behind a
// reverse proxy the request's absolute URL is the internal one, localhost:3010).
export async function GET() {
  await destroyCurrentSession();
  // Explicit expiring Set-Cookie with matching attributes guarantees a __Host-
  // cookie is removed even if the framework's delete doesn't repeat them.
  const expired = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  return new Response(null, { status: 303, headers: { Location: "/login", "Set-Cookie": expired } });
}
