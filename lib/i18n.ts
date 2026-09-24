// Server-side internationalization core (source-keyed: the Arabic text is the key).
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { SOURCE_LOCALE } from "@/lib/messages";

export const LOCALE_COOKIE = "gsdn_locale";

export interface LangInfo {
  code: string;
  name: string;
  abbreviation: string;
  direction: "ltr" | "rtl";
  isDefault: boolean;
  isEnabled: boolean;
}

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

export const getActiveLocale = cache(async (): Promise<string> => {
  const jar = await cookies();
  const pref = jar.get(LOCALE_COOKIE)?.value;
  const enabled = await getEnabledLanguages();
  if (pref && enabled.some((l) => l.code === pref)) return pref;
  return getDefaultLocale();
});

/** source-string -> translated value, for a locale. Source locale => empty (text as-is). */
export const getMessagesFor = cache(async (locale: string): Promise<Record<string, string>> => {
  const m: Record<string, string> = {};
  const rows = await prisma.translation.findMany({ where: { languageCode: locale }, select: { key: true, value: true } });
  for (const r of rows) if (r.value) m[r.key] = r.value;
  return m;
});

export interface I18n {
  locale: string;
  dir: "ltr" | "rtl";
  messages: Record<string, string>;
  t: (source: string) => string;
}

/** Resolve the i18n context for the current request. t(source) => translation || source. */
export const getI18n = cache(async (): Promise<I18n> => {
  const locale = await getActiveLocale();
  const [langs, messages] = await Promise.all([getLanguages(), getMessagesFor(locale)]);
  const dir = langs.find((l) => l.code === locale)?.direction ?? "rtl";
  const t = (source: string) => messages[source] ?? source;
  return { locale, dir, messages, t };
});
