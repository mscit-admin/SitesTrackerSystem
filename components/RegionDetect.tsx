"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinned, Check, Info } from "lucide-react";
import { detectRegion, type RegionDetection } from "@/lib/geoRegion";

const CONF_LABEL: Record<RegionDetection["confidence"], string> = {
  high: "دقة عالية",
  medium: "دقة متوسطة",
  low: "دقة منخفضة",
};

// Watches the latitude/longitude inputs in the same form and shows the Region /
// Sub-Region inferred from those coordinates. Empty Region/Sub-Region fields are
// filled automatically; a button lets the user apply the suggestion over any
// value that is already there.
export function RegionDetect({
  latName,
  lngName,
  regionName,
  subRegionName,
}: {
  latName: string;
  lngName: string;
  regionName: string;
  subRegionName: string;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [det, setDet] = useState<RegionDetection | null>(null);
  const [applied, setApplied] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const lastConf = useRef<RegionDetection["confidence"] | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pop a transient note whenever the confidence (i.e. the banner colour) changes.
  function noteConfidence(d: RegionDetection | null) {
    const conf = d?.confidence ?? null;
    if (conf === lastConf.current) return;
    lastConf.current = conf;
    if (!d) return;
    const msg =
      d.confidence === "high"
        ? `دقة عالية — أقرب موقع معروف على بُعد ~${d.nearestKm} كم.`
        : d.confidence === "medium"
          ? `دقة متوسطة — أقرب موقع على بُعد ~${d.nearestKm} كم؛ يُنصح بمراجعة المنطقة الفرعية.`
          : `دقة منخفضة — أقرب موقع على بُعد ~${d.nearestKm} كم، قد تكون خارج نطاق المواقع المعروفة؛ تحقّق يدوياً.`;
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 6000);
  }

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const latEl = form.querySelector(`[name="${latName}"]`) as HTMLInputElement | null;
    const lngEl = form.querySelector(`[name="${lngName}"]`) as HTMLInputElement | null;
    const regEl = form.querySelector(`[name="${regionName}"]`) as HTMLSelectElement | HTMLInputElement | null;
    const subEl = form.querySelector(`[name="${subRegionName}"]`) as HTMLInputElement | null;
    if (!latEl || !lngEl) return;

    const setField = (el: HTMLSelectElement | HTMLInputElement | null, value: string) => {
      if (!el) return;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const recompute = (autofill: boolean) => {
      const lat = parseFloat(latEl.value);
      const lng = parseFloat(lngEl.value);
      const d = !isNaN(lat) && !isNaN(lng) ? detectRegion(lat, lng) : null;
      setDet(d);
      setApplied(false);
      noteConfidence(d);
      if (d && autofill) {
        // Only fill blanks automatically; never overwrite existing values here.
        if (regEl && !regEl.value) setField(regEl, d.region);
        if (subEl && !subEl.value && d.subRegion) setField(subEl, d.subRegion);
      }
    };

    recompute(false); // initial (don't clobber prefilled data on edit)
    const onInput = () => recompute(true);
    latEl.addEventListener("input", onInput);
    lngEl.addEventListener("input", onInput);
    return () => {
      latEl.removeEventListener("input", onInput);
      lngEl.removeEventListener("input", onInput);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latName, lngName, regionName, subRegionName]);

  function apply() {
    const form = anchor.current?.closest("form");
    if (!form || !det) return;
    const regEl = form.querySelector(`[name="${regionName}"]`) as HTMLSelectElement | HTMLInputElement | null;
    const subEl = form.querySelector(`[name="${subRegionName}"]`) as HTMLInputElement | null;
    const set = (el: HTMLSelectElement | HTMLInputElement | null, v: string) => {
      if (!el) return;
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(regEl, det.region);
    if (det.subRegion) set(subEl, det.subRegion);
    setApplied(true);
  }

  const tone =
    det?.confidence === "high"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : det?.confidence === "medium"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div ref={anchor} className="relative">
      {det ? (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border px-3 py-2 text-xs ${tone}`}>
          <span className="flex items-center gap-1.5 font-medium">
            <MapPinned size={14} /> المنطقة المكتشفة من الإحداثيات:
          </span>
          <span className="font-semibold">{det.region}</span>
          {det.subRegion && (
            <>
              <span className="opacity-60">←</span>
              <span className="font-semibold">{det.subRegion}</span>
            </>
          )}
          <span className="opacity-70" dir="ltr">
            (~{det.nearestKm} كم)
          </span>

          {/* Confidence badge + hover legend explaining the colour */}
          <span className="group relative flex items-center gap-1 font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-current" />
            {CONF_LABEL[det.confidence]}
            <Info size={12} className="cursor-help opacity-70" />
            <span
              className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 hidden w-64 rounded-md border border-gray-200 bg-white p-2.5 text-right text-[11px] leading-relaxed text-gray-600 shadow-pop group-hover:block"
              dir="rtl"
            >
              <b className="text-gray-800">دلالة اللون</b> — يعكس مدى قرب أقرب موقع معروف:
              <span className="mt-1 flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> أخضر: دقة عالية (≤ 8 كم)</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> أزرق: دقة متوسطة (≤ 25 كم)</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> كهرماني: دقة منخفضة (&gt; 25 كم)</span>
            </span>
          </span>

          <button
            type="button"
            onClick={apply}
            className="mr-auto rounded border border-current/30 px-2 py-0.5 font-medium hover:bg-white/50"
          >
            {applied ? (
              <span className="flex items-center gap-1"><Check size={12} /> تم التطبيق</span>
            ) : (
              "تطبيق على الحقول"
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400">
          أدخل خط العرض والطول (أو اختر من الخريطة) ليقترح النظام المنطقة والمنطقة الفرعية تلقائياً.
        </div>
      )}

      {/* Transient note shown whenever the confidence (colour) changes */}
      {flash && (
        <div
          role="status"
          className={`absolute right-0 top-full z-30 mt-1.5 flex items-start gap-2 rounded-md border px-3 py-2 text-[11px] leading-relaxed shadow-pop ${tone}`}
          dir="rtl"
        >
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>{flash}</span>
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="mr-1 shrink-0 font-bold opacity-60 hover:opacity-100"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
