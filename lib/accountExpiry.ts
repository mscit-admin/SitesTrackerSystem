// Account validity window + expiry notifications.
import { prisma } from "@/lib/prisma";

export const WARN_DAYS = 7; // notify this many days before expiry

// Roles that should be notified about account expiry (besides the owner + admins).
const MANAGER_ROLE_NAMES = ["مدير المشروع", "مسؤول مرحلة"];

/** Is the account usable right now (active flag + within its validity window)? */
export function accountActive(
  u: { isActive: boolean; validFrom: Date | null; validTo: Date | null },
  now: Date = new Date()
): boolean {
  if (!u.isActive) return false;
  if (u.validFrom && now < u.validFrom) return false;
  if (u.validTo && now > u.validTo) return false;
  return true;
}

/** Owner + system admins + project managers + phase managers (distinct, active). */
export async function expiryRecipientIds(ownerId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { id: ownerId },
        { role: { isAdmin: true } },
        { role: { name: { in: MANAGER_ROLE_NAMES } } },
      ],
    },
    select: { id: true },
  });
  const set = new Set(users.map((u) => u.id));
  set.add(ownerId);
  return [...set];
}

async function notify(userIds: string[], type: string, title: string, body: string) {
  if (!userIds.length) return;
  await prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, type, title, body })) });
}

const SWEEP_KEY = "lastExpirySweep";
const SWEEP_INTERVAL_MS = 15 * 60_000;

/**
 * Disable expired accounts (and notify), and warn about accounts nearing expiry.
 * Throttled so it runs at most every 15 minutes regardless of traffic.
 */
export async function sweepAccountExpiry(): Promise<void> {
  const now = Date.now();
  const row = await prisma.appSetting.findUnique({ where: { key: SWEEP_KEY } });
  if (row && now - (parseInt(row.value, 10) || 0) < SWEEP_INTERVAL_MS) return;
  await prisma.appSetting.upsert({
    where: { key: SWEEP_KEY },
    update: { value: String(now) },
    create: { key: SWEEP_KEY, value: String(now) },
  });

  const nowD = new Date(now);
  const warnCutoff = new Date(now + WARN_DAYS * 86400_000);

  // 1) expired -> disable + force logout + notify
  const expired = await prisma.user.findMany({
    where: { isActive: true, validTo: { not: null, lt: nowD } },
    select: { id: true, firstName: true, lastName: true, employeeId: true },
  });
  for (const u of expired) {
    await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
    await prisma.session.deleteMany({ where: { userId: u.id } });
    const rec = await expiryRecipientIds(u.id);
    await notify(rec, "account_disabled", "تعطيل حساب منتهي",
      `تم تعطيل حساب المستخدم ${u.firstName} ${u.lastName} (${u.employeeId}) لانتهاء مدة صلاحيته.`);
  }

  // 2) approaching expiry -> warn once
  const soon = await prisma.user.findMany({
    where: { isActive: true, validTo: { gte: nowD, lte: warnCutoff }, expiryWarnedAt: null },
    select: { id: true, firstName: true, lastName: true, employeeId: true, validTo: true },
  });
  for (const u of soon) {
    const days = Math.max(0, Math.ceil((u.validTo!.getTime() - now) / 86400_000));
    await prisma.user.update({ where: { id: u.id }, data: { expiryWarnedAt: nowD } });
    const rec = await expiryRecipientIds(u.id);
    await notify(rec, "account_expiring", "قرب انتهاء مدة حساب",
      `حساب المستخدم ${u.firstName} ${u.lastName} (${u.employeeId}) سينتهي خلال ${days} يوم. يُرجى التجديد إن لزم.`);
  }
}
