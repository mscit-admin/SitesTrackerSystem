"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { OVERALL_LABELS } from "@/lib/lifecycle";

const STATUS_OPTIONS = Object.entries(OVERALL_LABELS).map(([k, v]) => ({
  value: k,
  label: v.ar,
}));

export function SitesFilterBar({
  regions,
  batches,
}: {
  regions: string[];
  batches: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/sites?${next.toString()}`);
    },
    [params, router]
  );

  const val = (k: string) => params.get(k) ?? "";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          defaultValue={val("q")}
          placeholder="بحث بالمعرّف أو الاسم أو المالك…"
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          className="field w-full pr-9"
        />
      </div>
      <select className="field" value={val("region")} onChange={(e) => update("region", e.target.value)}>
        <option value="">كل المناطق</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select className="field" value={val("status")} onChange={(e) => update("status", e.target.value)}>
        <option value="">كل الحالات</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select className="field" value={val("batch")} onChange={(e) => update("batch", e.target.value)}>
        <option value="">كل الدُفعات</option>
        {batches.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
      {(val("q") || val("region") || val("status") || val("batch") || val("phase")) && (
        <button onClick={() => router.push("/sites")} className="btn-ghost flex items-center gap-1">
          <X size={15} /> مسح
        </button>
      )}
    </div>
  );
}
