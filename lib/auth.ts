// Server-side authentication & authorization core.
import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parsePerms, permGranted } from "@/lib/permissions";
import { getSecuritySettings } from "@/lib/settings";
import { accountActive } from "@/lib/accountExpiry";

// __Host- prefix: browser enforces Secure + Path=/ + no Domain, so no other host
// on the shared nip.io domain can set/override it. Requires HTTPS (we have it).
export const SESSION_COOKIE = "__Host-gsdn_session";
// Edge-readable flag so the middleware can force a password change on every
// navigation (the root layout doesn't re-run on client-side nav).
export const MUSTCHANGE_COOKIE = "gsdn_mustchange";

export async function setMustChangeCookie(on: boolean) {
  const jar = await cookies();
  if (on) jar.set(MUSTCHANGE_COOKIE, "1", { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  else jar.set(MUSTCHANGE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: new Date(0), maxAge: 0 });
}

// A valid bcrypt hash of a random string, compared against when a user is not
// found so login timing doesn't reveal whether an identifier exists.
export const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);

/** Basic password policy: min 8 chars, at least one letter and one number. */
export function passwordIssue(pw: string): string | null {
  if (pw.length < 8) return "كلمة المرور 8 أحرف على الأقل";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "يجب أن تحتوي على حرف ورقم على الأقل";
  return null;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeId: string;
  email: string;
  mobile: string | null;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  roleId: string | null;
  roleName: string | null;
  isAdmin: boolean;
  permissions: string[];
}

// ---- password hashing ----
export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}
export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// ---- session tokens ----
function sha256(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex");
}

export async function createSession(userId: string, userAgent?: string | null) {
  const { absoluteDays } = await getSecuritySettings();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + absoluteDays * 86400_000);
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, lastSeenAt: new Date(), userAgent: userAgent?.slice(0, 300) ?? null },
  });
  // Purge this user's expired sessions.
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.set(MUSTCHANGE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: new Date(0), maxAge: 0 });
  // Clear with the SAME attributes the cookie was set with — a __Host- cookie is
  // only removed when the clearing cookie also carries Secure + Path=/. Use an
  // expiry in the past (maxAge:0 is treated as "unset" by some cookie encoders).
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: new Date(0), maxAge: 0 });
}

function toAuthUser(u: any): AuthUser {
  const perms = parsePerms(u.role?.permissions);
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`.trim(),
    employeeId: u.employeeId,
    email: u.email,
    mobile: u.mobile ?? null,
    avatarUrl: u.avatarUrl ?? null,
    twoFactorEnabled: u.twoFactorEnabled,
    mustChangePassword: u.mustChangePassword,
    roleId: u.roleId ?? null,
    roleName: u.role?.name ?? null,
    isAdmin: !!u.role?.isAdmin,
    permissions: perms,
  };
}

/** Current authenticated user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: true } } },
  });
  if (!session) return null;
  const now = Date.now();
  const { idleMinutes } = await getSecuritySettings();
  const idleMs = idleMinutes * 60_000;
  const expired = session.expiresAt.getTime() < now || now - session.lastSeenAt.getTime() > idleMs;
  if (expired) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!accountActive(session.user)) return null;
  // Slide the idle window (throttled to avoid a write on every request).
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return toAuthUser(session.user);
});

export function can(user: AuthUser | null, key: string): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return permGranted(user.permissions, key);
}

/** For server actions/pages: return the user or throw (caller redirects to /login). */
export async function requireUser(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/** Throw if the current user lacks a permission. */
export async function requirePermission(key: string): Promise<AuthUser> {
  const u = await requireUser();
  if (!can(u, key)) throw new Error("FORBIDDEN");
  return u;
}
