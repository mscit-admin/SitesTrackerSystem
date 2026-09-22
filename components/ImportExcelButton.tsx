"use client";

import { useRef, useState } from "react";
import { Upload, X, Check, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { importSitesFromExcel } from "@/app/sites/actions";

type Result = { ok: boolean; error?: string; total?: number; created?: number; updated?: number; failed?: number; errors?: string[] };

export function ImportExcelButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function close() {
    setOpen(false);
    setResult(null);
    setFileName("");
    formRef.current?.reset();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-1.5">
        <Upload size={16} /> تحديث من إكسل
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-pop" dir="rtl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">تحديث المواقع من ملف إكسل</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>

            <form
              ref={formRef}
              action={async (fd) => {
                setBusy(true);
                setResult(null);
                const r = await importSitesFromExcel(fd);
                setResult(r);
                setBusy(false);
              }}
              className="space-y-4 p-4"
            >
              <p className="text-xs leading-relaxed text-gray-500">
                ارفع ملف <b>GSDN Master</b> (بصيغة <code>.xlsb</code> أو <code>.xlsx</code>). تتم مطابقة المواقع
                بالمعرّف (Site ID): الموجود يُحدَّث، والجديد يُضاف. تُعاد المراحل ونسبة الإنجاز تلقائياً.
              </p>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 hover:border-brand hover:bg-brand-soft/40">
                <FileSpreadsheet size={18} className="text-brand" />
                {fileName || "اختر ملف الإكسل…"}
                <input
                  type="file"
                  name="file"
                  required
                  accept=".xlsb,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                />
              </label>

              {result && !result.ok && (
                <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle size={15} /> {result.error}
                </div>
              )}

              {result && result.ok && (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold"><Check size={15} /> تم التحديث</div>
                  <ul className="space-y-0.5 text-xs">
                    <li>الإجمالي المقروء: {result.total}</li>
                    <li>مواقع مُحدّثة: {result.updated}</li>
                    <li>مواقع مُضافة: {result.created}</li>
                    {(result.failed ?? 0) > 0 && <li className="text-red-600">فشل: {result.failed}</li>}
                  </ul>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-[11px] text-red-600">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                {result?.ok ? (
                  <button type="button" onClick={close} className="btn-primary">تم</button>
                ) : (
                  <>
                    <button type="button" onClick={close} className="btn-ghost">إلغاء</button>
                    <button type="submit" disabled={busy} className="btn-primary flex items-center gap-1.5">
                      <Upload size={15} /> {busy ? "جارٍ المعالجة…" : "رفع وتحديث"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
