"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinned, Check } from "lucide-react";
import { detectRegion, type RegionDetection } from "@/lib/geoRegion";

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
    <div ref={anchor}>
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
            (~{det.nearestKm} كم
            {det.confidence === "low" ? "، دقة منخفضة" : ""})
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
    </div>
  );
}
