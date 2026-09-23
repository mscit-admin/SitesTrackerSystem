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
} from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

type Res = { ok: boolean; error?: string; need2fa?: boolean };

/** Login by email OR employee ID + password, with optional TOTP. */
export async function login(formData: FormData): Promise<Res> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const totp = String(formData.get("totp") ?? "").trim();
  if (!identifier || !password) return { ok: false, error: "أدخل المعرّف وكلمة المرور" };

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { employeeId: identifier }],
    },
  });
  // Constant-ish response to avoid leaking which part was wrong.
  if (!user || !user.isActive) return { ok: false, error: "بيانات الدخول غير صحيحة" };

  const good = await verifyPassword(password, user.passwordHash);
  if (!good) return { ok: false, error: "بيانات الدخول غير صحيحة" };

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!totp) return { ok: false, need2fa: true };
    if (!verifyTotp(totp, user.twoFactorSecret)) return { ok: false, need2fa: true, error: "رمز التحقق غير صحيح" };
  }

  const ua = (await headers()).get("user-agent");
  await createSession(user.id, ua);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true };
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
  if (next.length < 8) return { ok: false, error: "كلمة المرور الجديدة 8 أحرف على الأقل" };
  if (next !== confirm) return { ok: false, error: "كلمتا المرور غير متطابقتين" };

  const row = await prisma.user.findUnique({ where: { id: me.id } });
  if (!row) return { ok: false, error: "المستخدم غير موجود" };
  if (!(await verifyPassword(current, row.passwordHash)))
    return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };

  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  return { ok: true };
}
