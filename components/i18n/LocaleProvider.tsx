"use client";

import { createContext, useContext } from "react";

export interface LangOption {
  code: string;
  name: string;
  abbreviation: string;
}
export interface LocaleCtx {
  locale: string;
  dir: "ltr" | "rtl";
  messages: Record<string, string>;
  languages: LangOption[];
}

const Ctx = createContext<LocaleCtx>({ locale: "ar", dir: "rtl", messages: {}, languages: [] });

export function LocaleProvider({ value, children }: { value: LocaleCtx; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Client-side translator: const t = useT(); t("النص المصدر") => translation || source. */
export function useT() {
  const { messages } = useContext(Ctx);
  return (source: string) => messages[source] ?? source;
}

export function useLocale() {
  return useContext(Ctx);
}
