"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroyCurrentSession,
  hashPassword,
  verifyPassword,
  requireUser,
  getCurrentUser,
  DUMMY_HASH,
  setMustChangeCookie,
} from "@/lib/auth";
import { validatePassword } from "@/lib/passwordPolicy";
import { verifyTotp } from "@/lib/totp";
import { isLocked, recordFailure, recordSuccess } from "@/lib/rateLimit";
import { getSecuritySettings } from "@/lib/settings";
import { accountActive } from "@/lib/accountExpiry";
import { logAudit, AUDIT } from "@/lib/audit";

const actorOf = (u: { id: string; firstName: string; lastName: string; email: string; role?: { name: string } | null }) => ({
  id: u.id,
  fullName: `${u.firstName} ${u.lastName}`.trim(),
  email: u.email,
  roleName: u.role?.name ?? null,
});

type Res = { ok: boolean; error?: string; need2fa?: boolean; mustChange?: boolean };

/** Login by email OR employee ID + password, with optional TOTP. */
export async function login(formData: FormData): Promise<Res> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const totp = String(formData.get("totp") ?? "").trim();
  if (!identifier || !password) return { ok: false, error: "أدخل المعرّف وكلمة المرور" };

  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const rlKey = `${identifier}|${ip}`;

  const { maxFailures, lockMinutes } = await getSecuritySettings();

  const lock = isLocked(rlKey);
  if (lock.locked) {
    await logAudit({ category: AUDIT.AUTH, action: "LOGIN_LOCKED", success: false, actor: null,
      entityLabel: identifier, summary: `حظر مؤقت بسبب محاولات دخول كثيرة (${identifier})`, ip });
    return { ok: false, error: `محاولات كثيرة. حاول بعد ${Math.ceil((lock.retryAfterSec ?? 0) / 60)} دقيقة.` };
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { employeeId: identifier }] },
    include: { role: true },
  });

  // Always run a bcrypt compare (constant-ish time; hides whether the id exists).
  const good = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !good) {
    recordFailure(rlKey, maxFailures, lockMinutes);
    await logAudit({ category: AUDIT.AUTH, action: "LOGIN_FAILURE", success: false,
      actor: user ? actorOf(user) : null, entityLabel: identifier,
      summary: `محاولة دخول فاشلة (${identifier})`, ip });
    return { ok: false, error: "بيانات الدخول غير صحيحة" };
  }
  // Credentials are valid — but the account may be disabled or outside its
  // validity window (from/to dates).
  if (!accountActive(user)) {
    await logAudit({ category: AUDIT.AUTH, action: "LOGIN_DISABLED", success: false, actor: actorOf(user),
      entityLabel: identifier, summary: "محاولة دخول لحساب معطّل أو منتهي الصلاحية", ip });
    return { ok: false, error: "الحساب معطّل أو انتهت مدة صلاحيته. يُرجى مراجعة مسؤول النظام." };
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!totp) return { ok: false, need2fa: true };
    if (!verifyTotp(totp, user.twoFactorSecret)) {
      recordFailure(rlKey, maxFailures, lockMinutes);
      await logAudit({ category: AUDIT.AUTH, action: "LOGIN_2FA_FAILURE", success: false, actor: actorOf(user),
        entityLabel: identifier, summary: "فشل رمز التحقق الثنائي (2FA)", ip });
      return { ok: false, need2fa: true, error: "رمز التحقق غير صحيح" };
    }
  }

  recordSuccess(rlKey);
  await createSession(user.id, hdrs.get("user-agent"));
  await setMustChangeCookie(user.mustChangePassword); // gate handled by middleware
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({ category: AUDIT.AUTH, action: "LOGIN_SUCCESS", actor: actorOf(user),
    entityLabel: user.email, summary: "تسجيل دخول ناجح", ip });
  return { ok: true, mustChange: user.mustChangePassword };
}

export async function logout() {
  const me = await getCurrentUser();
  if (me) await logAudit({ category: AUDIT.AUTH, action: "LOGOUT", actor: me, entityLabel: me.email, summary: "تسجيل خروج" });
  await destroyCurrentSession();
  redirect("/login");
}

/** Change the current user's own password. */
export async function changeOwnPassword(formData: FormData): Promise<Res> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const issue = await validatePassword(next);
  if (issue) return { ok: false, error: issue };
  if (next !== confirm) return { ok: false, error: "كلمتا المرور غير متطابقتين" };

  const row = await prisma.user.findUnique({ where: { id: me.id } });
  if (!row) return { ok: false, error: "المستخدم غير موجود" };
  if (!(await verifyPassword(current, row.passwordHash)))
    return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };

  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  await setMustChangeCookie(false); // lift the middleware gate
  await logAudit({ category: AUDIT.SECURITY, action: "PASSWORD_CHANGE", actor: me,
    entity: "User", entityId: me.id, entityLabel: me.email, summary: "غيّر المستخدم كلمة مروره" });
  return { ok: true };
}
