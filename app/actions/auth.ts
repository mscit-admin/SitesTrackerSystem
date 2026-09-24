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
  DUMMY_HASH,
  setMustChangeCookie,
} from "@/lib/auth";
import { validatePassword } from "@/lib/passwordPolicy";
import { verifyTotp } from "@/lib/totp";
import { isLocked, recordFailure, recordSuccess } from "@/lib/rateLimit";
import { getSecuritySettings } from "@/lib/settings";
import { accountActive } from "@/lib/accountExpiry";

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
    return { ok: false, error: `محاولات كثيرة. حاول بعد ${Math.ceil((lock.retryAfterSec ?? 0) / 60)} دقيقة.` };
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { employeeId: identifier }] },
  });

  // Always run a bcrypt compare (constant-ish time; hides whether the id exists).
  const good = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !good) {
    recordFailure(rlKey, maxFailures, lockMinutes);
    return { ok: false, error: "بيانات الدخول غير صحيحة" };
  }
  // Credentials are valid — but the account may be disabled or outside its
  // validity window (from/to dates).
  if (!accountActive(user)) {
    return { ok: false, error: "الحساب معطّل أو انتهت مدة صلاحيته. يُرجى مراجعة مسؤول النظام." };
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!totp) return { ok: false, need2fa: true };
    if (!verifyTotp(totp, user.twoFactorSecret)) {
      recordFailure(rlKey, maxFailures, lockMinutes);
      return { ok: false, need2fa: true, error: "رمز التحقق غير صحيح" };
    }
  }

  recordSuccess(rlKey);
  await createSession(user.id, hdrs.get("user-agent"));
  await setMustChangeCookie(user.mustChangePassword); // gate handled by middleware
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true, mustChange: user.mustChangePassword };
}

export async function logout() {
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
  return { ok: true };
}
