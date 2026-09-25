"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { setSecuritySettings, getSecuritySettings, type SecuritySettings } from "@/lib/settings";
import { setPasswordPolicy, getPasswordPolicy, PASSWORD_POLICY_DEFAULTS, type PasswordPolicy } from "@/lib/passwordPolicy";
import { logAudit, AUDIT, getAuditRetentionMonths, setAuditRetentionMonths } from "@/lib/audit";

const name = (fd: FormData) => String(fd.get("name") ?? "").trim();

export async function saveSecuritySettings(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePermission("settings.edit");
  const num = (k: string) => parseInt(String(fd.get(k) ?? ""), 10);
  const before = await getSecuritySettings();
  const values: Partial<SecuritySettings> = {
    idleMinutes: num("idleMinutes"),
    absoluteDays: num("absoluteDays"),
    maxFailures: num("maxFailures"),
    lockMinutes: num("lockMinutes"),
  };
  await setSecuritySettings(values);
  await logAudit({ category: AUDIT.POLICY, action: "SETTINGS_CHANGE", actor: me,
    entity: "SecuritySettings", entityLabel: "إعدادات الأمان",
    summary: "تعديل إعدادات الأمان (مهلة الخمول/انتهاء الجلسة/محاولات الدخول)",
    before, after: values });
  revalidatePath("/settings");
  return { ok: true };
}

export async function savePasswordPolicy(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePermission("settings.edit");
  const beforePolicy = await getPasswordPolicy();
  const num = (k: string, d: number) => {
    const n = parseInt(String(fd.get(k) ?? ""), 10);
    return Number.isFinite(n) ? n : d;
  };
  const on = (k: string) => fd.get(k) != null;
  const codes = String(fd.get("langCodes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const langLetters: Record<string, boolean> = {};
  for (const c of codes) langLetters[c] = fd.get(`lang_${c}`) != null;

  const policy: PasswordPolicy = {
    minLength: num("minLength", PASSWORD_POLICY_DEFAULTS.minLength),
    minDigits: num("minDigits", PASSWORD_POLICY_DEFAULTS.minDigits),
    minLetters: num("minLetters", PASSWORD_POLICY_DEFAULTS.minLetters),
    requireUppercase: on("requireUppercase"),
    requireLowercase: on("requireLowercase"),
    requireSymbol: on("requireSymbol"),
    allowSymbols: on("allowSymbols"),
    langLetters,
  };
  await setPasswordPolicy(policy);
  await logAudit({ category: AUDIT.POLICY, action: "POLICY_CHANGE", actor: me,
    entity: "PasswordPolicy", entityLabel: "سياسة كلمة المرور",
    summary: "تعديل سياسة قوة كلمة المرور", before: beforePolicy, after: policy });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveAuditRetention(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePermission("settings.edit");
  const before = await getAuditRetentionMonths();
  const months = parseInt(String(fd.get("months") ?? ""), 10);
  if (!Number.isFinite(months) || months < 0) return { ok: false, error: "قيمة غير صالحة" };
  await setAuditRetentionMonths(months);
  await logAudit({ category: AUDIT.POLICY, action: "SETTINGS_CHANGE", actor: me,
    entity: "AppSetting", entityId: "auditRetentionMonths", entityLabel: "مدة حفظ سجل التدقيق",
    summary: `تغيير مدة حفظ سجل التدقيق إلى ${months === 0 ? "بلا حد (حفظ دائم)" : months + " شهر"}`,
    before: { months: before }, after: { months } });
  revalidatePath("/settings");
  return { ok: true };
}

function done() {
  revalidatePath("/settings");
  revalidatePath("/acquisition");
}

export async function addEquipmentType(fd: FormData) {
  const me = await requirePermission("settings.edit");
  const n = name(fd);
  if (!n) return { ok: false, error: "الاسم مطلوب" };
  const exists = await prisma.equipmentType.findUnique({ where: { name: n } });
  if (exists) return { ok: false, error: "موجود مسبقاً" };
  const row = await prisma.equipmentType.create({ data: { name: n } });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: me,
    entity: "EquipmentType", entityId: row.id, entityLabel: n, summary: `إضافة نوع معدة: ${n}` });
  done();
  return { ok: true };
}

export async function removeEquipmentType(fd: FormData) {
  const me = await requirePermission("settings.edit");
  const id = String(fd.get("id") ?? "");
  if (id) {
    const row = await prisma.equipmentType.delete({ where: { id } }).catch(() => null);
    if (row) await logAudit({ category: AUDIT.DATA_CHANGE, action: "DELETE", actor: me,
      entity: "EquipmentType", entityId: id, entityLabel: row.name, summary: `حذف نوع معدة: ${row.name}` });
  }
  done();
}

export async function addManufacturer(fd: FormData) {
  const me = await requirePermission("settings.edit");
  const n = name(fd);
  if (!n) return { ok: false, error: "الاسم مطلوب" };
  const exists = await prisma.manufacturer.findUnique({ where: { name: n } });
  if (exists) return { ok: false, error: "موجود مسبقاً" };
  const row = await prisma.manufacturer.create({ data: { name: n } });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: me,
    entity: "Manufacturer", entityId: row.id, entityLabel: n, summary: `إضافة شركة مصنّعة: ${n}` });
  done();
  return { ok: true };
}

export async function removeManufacturer(fd: FormData) {
  const me = await requirePermission("settings.edit");
  const id = String(fd.get("id") ?? "");
  if (id) {
    const row = await prisma.manufacturer.delete({ where: { id } }).catch(() => null);
    if (row) await logAudit({ category: AUDIT.DATA_CHANGE, action: "DELETE", actor: me,
      entity: "Manufacturer", entityId: id, entityLabel: row.name, summary: `حذف شركة مصنّعة: ${row.name}` });
  }
  done();
}

export async function setSitesPageSize(fd: FormData) {
  const me = await requirePermission("settings.edit");
  const value = String(fd.get("value") ?? "").trim();
  if (!["10", "15", "25"].includes(value)) return { ok: false, error: "قيمة غير صالحة" };
  await prisma.appSetting.upsert({
    where: { key: "sitesPageSize" },
    update: { value },
    create: { key: "sitesPageSize", value },
  });
  await logAudit({ category: AUDIT.POLICY, action: "SETTINGS_CHANGE", actor: me,
    entity: "AppSetting", entityId: "sitesPageSize", entityLabel: "حجم صفحة المواقع",
    summary: `تغيير حجم صفحة المواقع إلى ${value}`, after: { value } });
  revalidatePath("/settings");
  revalidatePath("/sites");
  return { ok: true };
}
