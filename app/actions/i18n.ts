"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { ALL_MESSAGE_KEYS } from "@/lib/messages";
import { parseCsv } from "@/lib/csv";

type Res = { ok: boolean; error?: string; count?: number };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Switch the current browser's language (any enabled language). */
export async function setLocale(code: string): Promise<void> {
  const lang = await prisma.language.findFirst({ where: { code, isEnabled: true }, select: { code: true } });
  const jar = await cookies();
  if (lang) {
    jar.set(LOCALE_COOKIE, code, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
}

// ---------------- Admin: language management ----------------
export async function addLanguage(fd: FormData): Promise<Res> {
  await requirePermission("localization.languages");
  const code = str(fd, "code").toLowerCase();
  const name = str(fd, "name");
  const abbreviation = str(fd, "abbreviation").toUpperCase();
  const direction = str(fd, "direction") === "rtl" ? "rtl" : "ltr";
  if (!/^[a-z]{2,8}(-[a-z0-9]{2,8})?$/i.test(code)) return { ok: false, error: "رمز اللغة غير صالح (مثال: en, fr, it)" };
  if (!name || !abbreviation) return { ok: false, error: "الاسم والاختصار مطلوبان" };
  const exists = await prisma.language.findUnique({ where: { code }, select: { code: true } });
  if (exists) return { ok: false, error: "رمز اللغة مستخدم مسبقاً" };
  const max = await prisma.language.aggregate({ _max: { sortOrder: true } });
  await prisma.language.create({
    data: { code, name, abbreviation, direction, isEnabled: true, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  revalidatePath("/settings/languages");
  return { ok: true };
}

export async function updateLanguage(fd: FormData): Promise<Res> {
  await requirePermission("localization.languages");
  const code = str(fd, "code");
  const name = str(fd, "name");
  const abbreviation = str(fd, "abbreviation").toUpperCase();
  const direction = str(fd, "direction") === "rtl" ? "rtl" : "ltr";
  if (!name || !abbreviation) return { ok: false, error: "الاسم والاختصار مطلوبان" };
  await prisma.language.update({ where: { code }, data: { name, abbreviation, direction } });
  revalidatePath("/settings/languages");
  return { ok: true };
}

export async function setLanguageEnabled(fd: FormData): Promise<Res> {
  await requirePermission("localization.languages");
  const code = str(fd, "code");
  const enabled = str(fd, "enabled") === "1";
  const lang = await prisma.language.findUnique({ where: { code } });
  if (!lang) return { ok: false, error: "غير موجودة" };
  if (!enabled && lang.isDefault) return { ok: false, error: "لا يمكن تعطيل اللغة الافتراضية" };
  await prisma.language.update({ where: { code }, data: { isEnabled: enabled } });
  revalidatePath("/settings/languages");
  return { ok: true };
}

export async function setDefaultLanguage(fd: FormData): Promise<Res> {
  await requirePermission("localization.languages");
  const code = str(fd, "code");
  await prisma.$transaction([
    prisma.language.updateMany({ data: { isDefault: false } }),
    prisma.language.update({ where: { code }, data: { isDefault: true, isEnabled: true } }),
  ]);
  revalidatePath("/settings/languages");
  return { ok: true };
}

export async function deleteLanguage(fd: FormData): Promise<Res> {
  await requirePermission("localization.languages");
  const code = str(fd, "code");
  const lang = await prisma.language.findUnique({ where: { code } });
  if (!lang) return { ok: false, error: "غير موجودة" };
  if (lang.isDefault) return { ok: false, error: "لا يمكن حذف اللغة الافتراضية" };
  await prisma.language.delete({ where: { code } });
  revalidatePath("/settings/languages");
  return { ok: true };
}

/** Import a translated CSV (columns: key, source, translation) for a language. */
export async function importTranslations(fd: FormData): Promise<Res> {
  await requirePermission("localization.translate");
  const code = str(fd, "code");
  const csv = String(fd.get("csv") ?? "");
  const lang = await prisma.language.findUnique({ where: { code }, select: { code: true } });
  if (!lang) return { ok: false, error: "اللغة غير موجودة" };

  const rows = parseCsv(csv);
  if (rows.length === 0) return { ok: false, error: "الملف فارغ" };
  // detect header row
  const start = rows[0][0]?.toLowerCase() === "key" ? 1 : 0;
  const known = new Set(ALL_MESSAGE_KEYS);

  let count = 0;
  const ops: any[] = [];
  for (let i = start; i < rows.length; i++) {
    const key = (rows[i][0] ?? "").trim();
    const value = (rows[i][2] ?? "").trim(); // 3rd column = translation
    if (!key || !known.has(key)) continue;
    if (!value) continue;
    ops.push(
      prisma.translation.upsert({
        where: { languageCode_key: { languageCode: code, key } },
        update: { value },
        create: { languageCode: code, key, value },
      })
    );
    count++;
  }
  if (ops.length) await prisma.$transaction(ops);
  revalidatePath("/settings/languages");
  revalidatePath("/", "layout");
  return { ok: true, count };
}
