import { destroyCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

// Clears the session row + cookie, then sends the user to the login screen.
// Uses a RELATIVE Location so the browser stays on the public host (behind a
// reverse proxy, the request's absolute URL is the internal one, e.g.
// http://localhost:3010).
export async function GET() {
  await destroyCurrentSession();
  return new Response(null, { status: 303, headers: { Location: "/login" } });
}
