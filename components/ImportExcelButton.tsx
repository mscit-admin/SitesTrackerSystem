"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Check, AlertTriangle, FileSpreadsheet } from "lucide-react";

type Result = { ok: boolean; error?: string; total?: number; created?: number; updated?: number; failed?: number; errors?: string[] };

export function ImportExcelButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; created: number; updated: number; failed: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setResult(null);
    setProgress(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    setProgress({ done: 0, total: 0, created: 0, updated: 0, failed: 0 });

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sites/import", { method: "POST", body: fd });
      if (!res.body) throw new Error("لا استجابة من الخادم");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.type === "start" || msg.type === "progress") {
            setProgress({ done: msg.done ?? 0, total: msg.total, created: msg.created ?? 0, updated: msg.updated ?? 0, failed: msg.failed ?? 0 });
          } else if (msg.type === "result") {
            setResult({ ok: true, ...msg });
          } else if (msg.type === "error") {
            setResult({ ok: false, error: msg.error });
          }
        }
      }
      router.refresh();
    } catch (err: any) {
      setResult({ ok: false, error: err?.message || "تعذّر رفع الملف." });
    } finally {
      setBusy(false);
    }
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-1.5">
        <Upload size={16} /> تحديث من إكسل
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget && !busy) close(); }}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-pop" dir="rtl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">تحديث المواقع من ملف إكسل</h3>
              <button onClick={close} disabled={busy} className="text-gray-400 hover:text-gray-700 disabled:opacity-40"><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="space-y-4 p-4">
              <p className="text-xs leading-relaxed text-gray-500">
                ارفع ملف <b>GSDN Master</b> (بصيغة <code>.xlsb</code> أو <code>.xlsx</code>). تتم مطابقة المواقع
                بالمعرّف (Site ID): الموجود يُحدَّث، والجديد يُضاف. تُعاد المراحل ونسبة الإنجاز تلقائياً.
              </p>

              <label className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm ${busy ? "cursor-not-allowed border-gray-200 text-gray-300" : "cursor-pointer border-gray-300 text-gray-600 hover:border-brand hover:bg-brand-soft/40"}`}>
                <FileSpreadsheet size={18} className="text-brand" />
                {fileName || "اختر ملف الإكسل…"}
                <input
                  ref={inputRef}
                  type="file"
                  name="file"
                  required
                  disabled={busy}
                  accept=".xlsb,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                />
              </label>

              {/* Live progress bar */}
              {progress && !result && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                    <span>{progress.total > 0 ? `جارٍ التحديث… ${progress.done} / ${progress.total}` : "جارٍ قراءة الملف…"}</span>
                    <span className="tabular-nums font-semibold text-brand">{pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                  <div className="mt-1 flex gap-3 text-[11px] text-gray-400">
                    <span>مُحدّثة: {progress.updated}</span>
                    <span>مُضافة: {progress.created}</span>
                    {progress.failed > 0 && <span className="text-red-500">فشل: {progress.failed}</span>}
                  </div>
                </div>
              )}

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
                    <button type="button" onClick={close} disabled={busy} className="btn-ghost disabled:opacity-40">إلغاء</button>
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
