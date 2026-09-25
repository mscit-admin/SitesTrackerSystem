"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

export type AuditRowData = {
  id: string;
  time: string;
  category: string;
  categoryAr: string;
  action: string;
  actionAr: string;
  success: boolean;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  entity: string | null;
  entityLabel: string | null;
  summary: string | null;
  before: string | null;
  after: string | null;
  ip: string | null;
  userAgent: string | null;
};

const CAT_STYLE: Record<string, string> = {
  AUTH: "bg-sky-50 text-sky-700 border-sky-100",
  DATA_CHANGE: "bg-indigo-50 text-indigo-700 border-indigo-100",
  SECURITY: "bg-red-50 text-red-700 border-red-100",
  POLICY: "bg-amber-50 text-amber-700 border-amber-100",
  EXPORT_IMPORT: "bg-emerald-50 text-emerald-700 border-emerald-100",
  SYSTEM: "bg-gray-100 text-gray-600 border-gray-200",
};

function pretty(json: string | null): string | null {
  if (!json) return null;
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function AuditRow({ r }: { r: AuditRowData }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(r.before || r.after || r.userAgent);
  const before = pretty(r.before);
  const after = pretty(r.after);

  return (
    <>
      <tr className={`border-t border-gray-100 ${!r.success ? "bg-red-50/40" : ""}`}>
        <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-gray-500">{r.time}</td>
        <td className="px-3 py-2">
          <span className={`chip border ${CAT_STYLE[r.category] ?? CAT_STYLE.SYSTEM}`}>{r.categoryAr}</span>
        </td>
        <td className="px-3 py-2 text-[13px] text-gray-700">
          {r.actionAr}
          {!r.success && <span className="mr-1 text-[11px] text-red-600"> (فشل)</span>}
        </td>
        <td className="px-3 py-2 text-[13px] text-gray-800">
          {r.actorName ? (
            <div>
              <div className="font-medium">{r.actorName}</div>
              <div className="text-[11px] text-gray-400">{r.actorEmail}{r.actorRole ? ` · ${r.actorRole}` : ""}</div>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-[13px] text-gray-700">
          {r.summary}
          {r.entityLabel && (
            <div className="text-[11px] text-gray-400">{r.entity} · {r.entityLabel}</div>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-gray-500" dir="ltr">{r.ip ?? "—"}</td>
        <td className="px-3 py-2 text-left">
          {hasDetail && (
            <button onClick={() => setOpen((o) => !o)} className="btn-ghost px-2 py-1 text-xs">
              {open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </td>
      </tr>
      {open && hasDetail && (
        <tr className="border-t border-gray-100 bg-gray-50/70">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {before && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-gray-500">قبل</div>
                  <pre className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-white p-2 text-[11px] text-gray-700" dir="ltr">{before}</pre>
                </div>
              )}
              {after && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-gray-500">بعد / التغييرات</div>
                  <pre className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-white p-2 text-[11px] text-gray-700" dir="ltr">{after}</pre>
                </div>
              )}
            </div>
            {r.userAgent && (
              <div className="mt-2 text-[11px] text-gray-400" dir="ltr">UA: {r.userAgent}</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
