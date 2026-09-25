// Central audit-trail helper. Every security-relevant event and data change is
// appended to the AuditLog table through logAudit(). It NEVER throws into the
// caller: a logging failure must not break the user's action.
//
// This module deliberately does NOT import lib/auth.ts (which imports nothing
// from here) to keep the dependency graph acyclic — callers pass the actor.
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// ---- categories ----
export const AUDIT = {
  AUTH: "AUTH",
  DATA_CHANGE: "DATA_CHANGE",
  SECURITY: "SECURITY",
  POLICY: "POLICY",
  EXPORT_IMPORT: "EXPORT_IMPORT",
  SYSTEM: "SYSTEM",
} as const;
export type AuditCategory = (typeof AUDIT)[keyof typeof AUDIT];

// Arabic labels for display.
export const CATEGORY_AR: Record<string, string> = {
  AUTH: "الدخول والمصادقة",
  DATA_CHANGE: "تغيير البيانات",
  SECURITY: "الأمان والصلاحيات",
  POLICY: "السياسات والإعدادات",
  EXPORT_IMPORT: "التصدير والاستيراد",
  SYSTEM: "النظام",
};

export const ACTION_AR: Record<string, string> = {
  LOGIN_SUCCESS: "تسجيل دخول ناجح",
  LOGIN_FAILURE: "محاولة دخول فاشلة",
  LOGIN_LOCKED: "حظر بسبب محاولات كثيرة",
  LOGIN_2FA_FAILURE: "فشل رمز التحقق (2FA)",
  LOGIN_DISABLED: "دخول حساب معطّل/منتهٍ",
  LOGOUT: "تسجيل خروج",
  PASSWORD_CHANGE: "تغيير كلمة المرور",
  PASSWORD_RESET: "إعادة تعيين كلمة المرور",
  TWO_FACTOR_ENABLE: "تفعيل المصادقة الثنائية",
  TWO_FACTOR_DISABLE: "إلغاء المصادقة الثنائية",
  PERMISSION_DENIED: "محاولة وصول مرفوضة",
  ACCOUNT_ENABLED: "تفعيل حساب",
  ACCOUNT_DISABLED: "تعطيل حساب",
  ROLE_PERMISSIONS_CHANGE: "تعديل صلاحيات دور",
  SETTINGS_CHANGE: "تعديل إعدادات",
  POLICY_CHANGE: "تعديل سياسة",
  LANGUAGE_CHANGE: "تغيير لغة",
  CREATE: "إنشاء",
  UPDATE: "تعديل",
  DELETE: "حذف",
  STAGE_CHANGE: "تغيير مرحلة",
  EXPORT: "تصدير",
  IMPORT: "استيراد",
};

// A lightweight actor. AuthUser (from lib/auth) is structurally compatible.
export interface AuditActor {
  id?: string | null;
  fullName?: string | null;
  email?: string | null;
  roleName?: string | null;
}

export interface AuditInput {
  category: AuditCategory;
  action: string;
  success?: boolean;
  entity?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  /** Explicit actor. Pass null for anonymous events (e.g. failed login). */
  actor?: AuditActor | null;
  /** Override IP/UA (e.g. when already read in the caller). */
  ip?: string | null;
  userAgent?: string | null;
}

function toJson(v: unknown): string | null {
  if (v == null) return null;
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > 8000 ? s.slice(0, 8000) + "…" : s;
  } catch {
    return null;
  }
}

/** Read request IP + user-agent from the incoming headers (best effort). */
async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    const userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** Append one audit record. Swallows all errors. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const meta = await requestMeta();
    await prisma.auditLog.create({
      data: {
        category: input.category,
        action: input.action,
        success: input.success ?? true,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        summary: input.summary ?? null,
        before: toJson(input.before),
        after: toJson(input.after),
        actorId: input.actor?.id ?? null,
        actorName: input.actor?.fullName ?? null,
        actorEmail: input.actor?.email ?? null,
        actorRole: input.actor?.roleName ?? null,
        ip: input.ip ?? meta.ip,
        userAgent: input.userAgent ?? meta.userAgent,
      },
    });
  } catch {
    // Never let auditing break the primary action.
  }
}

/**
 * Compute a compact {field: {from, to}} diff over the given keys.
 * Returns null when nothing changed, so callers can skip a no-op audit.
 */
export function diffFields(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
  keys: string[]
): Record<string, { from: any; to: any }> | null {
  if (!before || !after) return null;
  const out: Record<string, { from: any; to: any }> = {};
  for (const k of keys) {
    const a = normalize(before[k]);
    const b = normalize(after[k]);
    if (a !== b) out[k] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return Object.keys(out).length ? out : null;
}

function normalize(v: any): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

// ---- retention ----
const RETENTION_KEY = "auditRetentionMonths";
const SWEEP_KEY = "lastAuditSweep";
const SWEEP_INTERVAL_MS = 24 * 3600_000; // at most once a day
export const RETENTION_DEFAULT_MONTHS = 24; // 0 = keep forever

export async function getAuditRetentionMonths(): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key: RETENTION_KEY } });
  if (!row) return RETENTION_DEFAULT_MONTHS;
  const n = parseInt(row.value, 10);
  return Number.isFinite(n) && n >= 0 ? n : RETENTION_DEFAULT_MONTHS;
}

export async function setAuditRetentionMonths(months: number): Promise<void> {
  const n = Number.isFinite(months) && months >= 0 ? Math.min(600, Math.round(months)) : RETENTION_DEFAULT_MONTHS;
  await prisma.appSetting.upsert({
    where: { key: RETENTION_KEY },
    update: { value: String(n) },
    create: { key: RETENTION_KEY, value: String(n) },
  });
}

/** Delete audit rows older than the retention window. Throttled; 0 = keep all. */
export async function sweepAuditRetention(): Promise<void> {
  try {
    const now = Date.now();
    const row = await prisma.appSetting.findUnique({ where: { key: SWEEP_KEY } });
    if (row && now - (parseInt(row.value, 10) || 0) < SWEEP_INTERVAL_MS) return;
    await prisma.appSetting.upsert({
      where: { key: SWEEP_KEY },
      update: { value: String(now) },
      create: { key: SWEEP_KEY, value: String(now) },
    });
    const months = await getAuditRetentionMonths();
    if (months <= 0) return; // keep forever
    const cutoff = new Date(now - months * 30 * 86400_000);
    await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  } catch {
    // best effort
  }
}
