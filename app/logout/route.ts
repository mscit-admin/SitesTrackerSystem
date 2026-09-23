import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

// Clears the session row + cookie, then sends the user to the login screen.
// Used by the idle guard and by the central guard for stale/expired cookies.
export async function GET(req: Request) {
  await destroyCurrentSession();
  return NextResponse.redirect(new URL("/login", req.url));
}
