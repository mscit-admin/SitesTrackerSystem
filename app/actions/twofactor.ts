"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword } from "@/lib/auth";
import { generateTotpSecret, totpKeyUri, qrDataUrl, verifyTotp } from "@/lib/totp";
import { logAudit, AUDIT } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/** Begin 2FA enrollment: create a fresh secret + QR (not yet enabled). */
export async function begin2fa(): Promise<{ ok: boolean; qr?: string; secret?: string; error?: string }> {
  const me = await requireUser();
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: me.id }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });
  const uri = totpKeyUri(me.email, secret);
  return { ok: true, qr: await qrDataUrl(uri), secret };
}

/** Confirm a code and enable 2FA. */
export async function enable2fa(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const me = await requireUser();
  const token = String(formData.get("token") ?? "");
  const row = await prisma.user.findUnique({ where: { id: me.id } });
  if (!row?.twoFactorSecret) return { ok: false, error: "ابدأ التفعيل أولاً" };
  if (!verifyTotp(token, row.twoFactorSecret)) return { ok: false, error: "الرمز غير صحيح، حاول مجدداً" };
  await prisma.user.update({ where: { id: me.id }, data: { twoFactorEnabled: true } });
  await logAudit({ category: AUDIT.SECURITY, action: "TWO_FACTOR_ENABLE", actor: me,
    entity: "User", entityId: me.id, entityLabel: me.email, summary: "فعّل المستخدم المصادقة الثنائية" });
  revalidatePath("/account/2fa");
  return { ok: true };
}

/** Disable 2FA (requires the account password). */
export async function disable2fa(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const me = await requireUser();
  const password = String(formData.get("password") ?? "");
  const row = await prisma.user.findUnique({ where: { id: me.id } });
  if (!row) return { ok: false, error: "المستخدم غير موجود" };
  if (!(await verifyPassword(password, row.passwordHash))) return { ok: false, error: "كلمة المرور غير صحيحة" };
  await prisma.user.update({ where: { id: me.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await logAudit({ category: AUDIT.SECURITY, action: "TWO_FACTOR_DISABLE", actor: me,
    entity: "User", entityId: me.id, entityLabel: me.email, summary: "ألغى المستخدم المصادقة الثنائية" });
  revalidatePath("/account/2fa");
  return { ok: true };
}
