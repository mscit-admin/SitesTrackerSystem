"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, Check, ChevronDown } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { setLocale } from "@/app/actions/i18n";

export function LanguageSwitcher() {
  const { locale, languages } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!languages || languages.length <= 1) return null;
  const current = languages.find((l) => l.code === locale);

  function choose(code: string) {
    setOpen(false);
    if (code === locale) return;
    // Set the locale cookie on the client immediately so the reloaded request
    // is guaranteed to carry the chosen language (no dependency on the server
    // action's Set-Cookie having flushed first).
    try { document.cookie = `gsdn_locale=${code}; path=/; max-age=31536000; samesite=lax`; } catch {}
    // Persist server-side too (best effort), then hard reload. A hard reload
    // re-renders from the Arabic source and translates cleanly — a soft refresh
    // would leave the previous language stuck on already-translated text nodes.
    Promise.resolve(setLocale(code)).finally(() => window.location.reload());
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-gray-600 hover:bg-gray-100" title="اللغة">
        <Languages size={15} />
        <span className="hidden sm:inline">{current?.abbreviation ?? locale.toUpperCase()}</span>
        <ChevronDown size={13} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute end-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-pop">
          {languages.map((l) => (
            <button key={l.code} onClick={() => choose(l.code)} className="flex w-full items-center justify-between px-3 py-2 text-right text-[13px] text-gray-700 hover:bg-gray-50">
              <span>{l.name}</span>
              {l.code === locale ? <Check size={14} className="text-brand" /> : <span className="text-[11px] text-gray-400">{l.abbreviation}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
