// Server-side authentication & authorization core.
import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parsePerms, permGranted } from "@/lib/permissions";

// __Host- prefix: browser enforces Secure + Path=/ + no Domain, so no other host
// on the shared nip.io domain can set/override it. Requires HTTPS (we have it).
export const SESSION_COOKIE = "__Host-gsdn_session";
const SESSION_DAYS = 7;

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
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) ?? null },
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
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
    jar.delete(SESSION_COOKIE);
  }
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
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;
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
