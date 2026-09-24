// Server-side internationalization core.
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { MESSAGES, SOURCE_LOCALE } from "@/lib/messages";

export const LOCALE_COOKIE = "gsdn_locale";

export interface LangInfo {
  code: string;
  name: string;
  abbreviation: string;
  direction: "ltr" | "rtl";
  isDefault: boolean;
  isEnabled: boolean;
}

/** Enabled languages, ordered. Always includes the source language as a fallback. */
export const getLanguages = cache(async (): Promise<LangInfo[]> => {
  const rows = await prisma.language.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const langs = rows.map((r) => ({
    code: r.code,
    name: r.name,
    abbreviation: r.abbreviation,
    direction: (r.direction === "rtl" ? "rtl" : "ltr") as "ltr" | "rtl",
    isDefault: r.isDefault,
    isEnabled: r.isEnabled,
  }));
  if (!langs.some((l) => l.code === SOURCE_LOCALE)) {
    langs.unshift({ code: SOURCE_LOCALE, name: "العربية", abbreviation: "AR", direction: "rtl", isDefault: true, isEnabled: true });
  }
  return langs;
});

export const getEnabledLanguages = cache(async (): Promise<LangInfo[]> => {
  return (await getLanguages()).filter((l) => l.isEnabled);
});

export const getDefaultLocale = cache(async (): Promise<string> => {
  const langs = await getLanguages();
  return langs.find((l) => l.isDefault && l.isEnabled)?.code ?? SOURCE_LOCALE;
});

/** The active locale for this request (cookie, if enabled), else the default. */
export const getActiveLocale = cache(async (): Promise<string> => {
  const jar = await cookies();
  const pref = jar.get(LOCALE_COOKIE)?.value;
  const enabled = await getEnabledLanguages();
  if (pref && enabled.some((l) => l.code === pref)) return pref;
  return getDefaultLocale();
});

/** key -> value map for a locale: source defaults overlaid with DB translations. */
export const getMessagesFor = cache(async (locale: string): Promise<Record<string, string>> => {
  const merged: Record<string, string> = { ...MESSAGES };
  if (locale !== SOURCE_LOCALE) {
    const rows = await prisma.translation.findMany({ where: { languageCode: locale }, select: { key: true, value: true } });
    for (const r of rows) if (r.value) merged[r.key] = r.value;
  } else {
    // allow overriding source text too
    const rows = await prisma.translation.findMany({ where: { languageCode: SOURCE_LOCALE }, select: { key: true, value: true } });
    for (const r of rows) if (r.value) merged[r.key] = r.value;
  }
  return merged;
});

export interface I18n {
  locale: string;
  dir: "ltr" | "rtl";
  messages: Record<string, string>;
  t: (key: string, fallback?: string) => string;
}

/** Resolve the full i18n context for the current request. */
export const getI18n = cache(async (): Promise<I18n> => {
  const locale = await getActiveLocale();
  const [langs, messages] = await Promise.all([getLanguages(), getMessagesFor(locale)]);
  const dir = langs.find((l) => l.code === locale)?.direction ?? "rtl";
  const t = (key: string, fallback?: string) => messages[key] ?? fallback ?? MESSAGES[key] ?? key;
  return { locale, dir, messages, t };
});
