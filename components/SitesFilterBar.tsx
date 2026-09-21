"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
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
  const selCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        type="search"
        defaultValue={val("q")}
        placeholder="بحث بالمعرّف أو الاسم أو المالك…"
        onKeyDown={(e) => {
          if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
        }}
        className={`${selCls} min-w-56 flex-1`}
      />
      <select className={selCls} value={val("region")} onChange={(e) => update("region", e.target.value)}>
        <option value="">كل المناطق</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select className={selCls} value={val("status")} onChange={(e) => update("status", e.target.value)}>
        <option value="">كل الحالات</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select className={selCls} value={val("batch")} onChange={(e) => update("batch", e.target.value)}>
        <option value="">كل الدُفعات</option>
        {batches.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
      {(val("q") || val("region") || val("status") || val("batch") || val("phase")) && (
        <button
          onClick={() => router.push("/sites")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
        >
          مسح الفلاتر
        </button>
      )}
    </div>
  );
}
