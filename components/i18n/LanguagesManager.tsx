"use client";

import { useRef, useState } from "react";
import { Plus, Pencil, Star, Power, Trash2, Download, Upload, X, Check, AlertTriangle, Globe } from "lucide-react";
import {
  addLanguage, updateLanguage, setLanguageEnabled, setDefaultLanguage, deleteLanguage, importTranslations,
} from "@/app/actions/i18n";

type Lang = {
  code: string; name: string; abbreviation: string; direction: string;
  isDefault: boolean; isEnabled: boolean; translated: number;
};

export function LanguagesManager({
  languages, totalKeys, canManage, canTranslate,
}: {
  languages: Lang[]; totalKeys: number; canManage: boolean; canTranslate: boolean;
}) {
  const [form, setForm] = useState<null | { mode: "add" } | { mode: "edit"; lang: Lang }>(null);
  const [importFor, setImportFor] = useState<Lang | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">إجمالي المفاتيح القابلة للترجمة: <b>{totalKeys}</b></p>
        {canManage && (
          <button onClick={() => setForm({ mode: "add" })} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> لغة جديدة
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">اللغة</th>
                <th className="th">الرمز</th>
                <th className="th">الاختصار</th>
                <th className="th">الاتجاه</th>
                <th className="th">مترجَم</th>
                <th className="th">الحالة</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {languages.map((l) => (
                <tr key={l.code} className="hover:bg-gray-50">
                  <td className="td">
                    <span className="flex items-center gap-2 font-medium text-gray-800">
                      <Globe size={15} className="text-gray-400" /> {l.name}
                      {l.isDefault && <span className="chip bg-amber-50 text-amber-700 border-amber-100"><Star size={11} /> افتراضية</span>}
                    </span>
                  </td>
                  <td className="td font-mono">{l.code}</td>
                  <td className="td">{l.abbreviation}</td>
                  <td className="td text-xs">{l.direction === "rtl" ? "RTL" : "LTR"}</td>
                  <td className="td text-xs">{l.translated}/{totalKeys}</td>
                  <td className="td">
                    {l.isEnabled
                      ? <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100">مفعّلة</span>
                      : <span className="chip bg-gray-100 text-gray-500 border-gray-200">معطّلة</span>}
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      {canTranslate && (
                        <>
                          <a href={`/api/i18n/export?lang=${l.code}`} title="تصدير CSV" className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                            <Download size={15} />
                          </a>
                          <button title="استيراد CSV" onClick={() => setImportFor(l)} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                            <Upload size={15} />
                          </button>
                        </>
                      )}
                      {canManage && (
                        <>
                          <button title="تعديل" onClick={() => setForm({ mode: "edit", lang: l })} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                            <Pencil size={15} />
                          </button>
                          {!l.isDefault && (
                            <form action={async (fd) => { await setDefaultLanguage(fd); }}>
                              <input type="hidden" name="code" value={l.code} />
                              <button title="تعيين كافتراضية" className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-amber-600"><Star size={15} /></button>
                            </form>
                          )}
                          {!l.isDefault && (
                            <form action={async (fd) => { await setLanguageEnabled(fd); }}>
                              <input type="hidden" name="code" value={l.code} />
                              <input type="hidden" name="enabled" value={l.isEnabled ? "0" : "1"} />
                              <button title={l.isEnabled ? "تعطيل" : "تفعيل"} className={`rounded p-1 hover:bg-gray-100 ${l.isEnabled ? "text-red-500" : "text-emerald-600"}`}><Power size={15} /></button>
                            </form>
                          )}
                          {!l.isDefault && (
                            <form action={async (fd) => { await deleteLanguage(fd); }}>
                              <input type="hidden" name="code" value={l.code} />
                              <button title="حذف" className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-700"><Trash2 size={15} /></button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && <LangModal initial={form.mode === "edit" ? form.lang : null} onClose={() => setForm(null)} />}
      {importFor && <ImportModal lang={importFor} onClose={() => setImportFor(null)} />}
    </div>
  );
}

function LangModal({ initial, onClose }: { initial: Lang | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;
  return (
    <Modal title={isEdit ? "تعديل لغة" : "لغة جديدة"} onClose={onClose}>
      <form
        action={async (fd) => {
          setError(null);
          const res = isEdit ? await updateLanguage(fd) : await addLanguage(fd);
          if (res.ok) onClose(); else setError(res.error ?? "تعذّر");
        }}
        className="space-y-3"
      >
        {error && <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle size={15} /> {error}</div>}
        <L label="اسم اللغة *"><input name="name" required defaultValue={initial?.name} className="field w-full" placeholder="مثال: English, Français" /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="اختصار اللغة *"><input name="abbreviation" required defaultValue={initial?.abbreviation} className="field w-full" placeholder="EN" dir="ltr" /></L>
          <L label="رمز اللغة في النظام *">
            <input name="code" required defaultValue={initial?.code} disabled={isEdit} className="field w-full disabled:bg-gray-100 disabled:text-gray-400" placeholder="en" dir="ltr" />
          </L>
        </div>
        <L label="اتجاه الكتابة">
          <select name="direction" defaultValue={initial?.direction ?? "ltr"} className="field w-full">
            <option value="ltr">من اليسار لليمين (LTR)</option>
            <option value="rtl">من اليمين لليسار (RTL)</option>
          </select>
        </L>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
          <button type="submit" className="btn-primary flex items-center gap-1.5"><Check size={15} /> حفظ</button>
        </div>
      </form>
    </Modal>
  );
}

function ImportModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg("اختر ملف CSV أولاً"); return; }
    setBusy(true); setMsg(null);
    const text = await file.text();
    const fd = new FormData();
    fd.append("code", lang.code);
    fd.append("csv", text);
    const res = await importTranslations(fd);
    setBusy(false);
    if (res.ok) setMsg(`تم استيراد ${res.count ?? 0} ترجمة بنجاح.`);
    else setMsg(res.error ?? "تعذّر الاستيراد");
  }

  return (
    <Modal title={`استيراد ترجمة: ${lang.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          صدّر ملف CSV، املأ العمود الثالث بالترجمة، ثم استورده هنا. تُحدَّث الواجهة فوراً بعد الاستيراد.
        </p>
        <a href={`/api/i18n/export?lang=${lang.code}`} className="btn-ghost inline-flex items-center gap-1.5"><Download size={15} /> تنزيل ملف الترجمة الحالي</a>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="block w-full text-sm" />
        {msg && <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{msg}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">إغلاق</button>
          <button type="button" onClick={submit} disabled={busy} className="btn-primary flex items-center gap-1.5">
            <Upload size={15} /> {busy ? "جارٍ الاستيراد…" : "استيراد"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-lg bg-white shadow-pop" dir="rtl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

const L = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
    {children}
  </div>
);
