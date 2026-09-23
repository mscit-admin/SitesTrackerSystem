"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, X, FileClock } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

// Drop inside a <form>. Continuously mirrors the form's field values to
// localStorage so unsaved work survives a session timeout, a closed tab, or a
// crash. Offers to restore the draft next time the form is opened.
//
// Dispatch `window.dispatchEvent(new CustomEvent("draft:clear",{detail:storageKey}))`
// after a successful save to drop the draft. A global "draft:flush" event forces
// an immediate write (fired by the idle-logout guard before the session ends).
export function DraftAutosave({ storageKey }: { storageKey: string }) {
  const { user } = useAuth();
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftAt, setDraftAt] = useState<string | null>(null);

  const key = `gsdn:draft:${user?.id ?? "anon"}:${storageKey}`;

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;

    const collect = () => {
      const data: Record<string, string> = {};
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input[name], select[name], textarea[name]"
      ).forEach((el) => {
        const name = el.getAttribute("name") || "";
        const type = (el as HTMLInputElement).type;
        if (!name || name.startsWith("__") || type === "password" || type === "file" || type === "hidden") return;
        data[name] = el.value ?? "";
      });
      return data;
    };

    const write = () => {
      try {
        const data = collect();
        const hasValue = Object.values(data).some((v) => v && v.trim() !== "");
        if (!hasValue) { localStorage.removeItem(key); return; }
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
      } catch { /* storage blocked — ignore */ }
    };

    const debouncedWrite = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(write, 800);
    };

    // show restore banner if a draft already exists
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.savedAt) setDraftAt(new Date(parsed.savedAt).toLocaleString("ar"));
      }
    } catch { /* ignore */ }

    const onFlush = () => write();
    const onVisibility = () => { if (document.visibilityState === "hidden") write(); };
    const onClear = (e: Event) => {
      if ((e as CustomEvent).detail === storageKey) { try { localStorage.removeItem(key); } catch {} setDraftAt(null); }
    };

    form.addEventListener("input", debouncedWrite);
    form.addEventListener("change", debouncedWrite);
    window.addEventListener("draft:flush", onFlush);
    window.addEventListener("pagehide", onFlush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("draft:clear", onClear);
    return () => {
      form.removeEventListener("input", debouncedWrite);
      form.removeEventListener("change", debouncedWrite);
      window.removeEventListener("draft:flush", onFlush);
      window.removeEventListener("pagehide", onFlush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("draft:clear", onClear);
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storageKey]);

  function restore() {
    const form = ref.current?.closest("form");
    if (!form) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const { data } = JSON.parse(raw) as { data: Record<string, string> };
      for (const [name, value] of Object.entries(data)) {
        const el = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${CSS.escape(name)}"]`);
        if (el && (el as HTMLInputElement).type !== "hidden") {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    } catch { /* ignore */ }
    setDraftAt(null);
  }
  function discard() {
    try { localStorage.removeItem(key); } catch {}
    setDraftAt(null);
  }

  return (
    <span ref={ref} className="contents">
      {draftAt && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <FileClock size={15} />
          <span>لديك بيانات غير محفوظة من جلسة سابقة ({draftAt}).</span>
          <button type="button" onClick={restore} className="mr-auto flex items-center gap-1 rounded border border-amber-300 px-2 py-0.5 font-medium hover:bg-white/60">
            <RotateCcw size={12} /> استعادة
          </button>
          <button type="button" onClick={discard} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-amber-100">
            <X size={12} /> تجاهل
          </button>
        </div>
      )}
    </span>
  );
}
