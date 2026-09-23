"use client";

import { useState } from "react";
import { ShieldCheck, Save, Check } from "lucide-react";
import { saveSecuritySettings } from "@/app/settings/actions";
import type { SecuritySettings as S } from "@/lib/settings";

export function SecuritySettings({ current, canEdit }: { current: S; canEdit: boolean }) {
  const [saved, setSaved] = useState(false);

  const Field = ({ name, label, hint, def }: { name: keyof S; label: string; hint: string; def: number }) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        name={name}
        type="number"
        min={1}
        defaultValue={def}
        disabled={!canEdit}
        className="field w-full disabled:bg-gray-100 disabled:text-gray-400"
      />
      <p className="mt-1 text-[11px] text-gray-400">{hint}</p>
    </div>
  );

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900">
        <ShieldCheck size={16} className="text-brand" /> الأمان والجلسة
      </h2>
      <p className="mb-4 text-xs text-gray-500">مهلة انتهاء الجلسة عند عدم النشاط، وضبط محاولات الدخول الخاطئة.</p>

      <form
        action={async (fd) => {
          const res = await saveSecuritySettings(fd);
          if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="idleMinutes" label="مهلة الخمول (دقائق)" def={current.idleMinutes} hint="يُسجَّل خروج المستخدم تلقائياً بعد هذه المدة دون نشاط." />
          <Field name="absoluteDays" label="أقصى عمر للجلسة (أيام)" def={current.absoluteDays} hint="تنتهي الجلسة نهائياً بعد هذه المدة مهما كان النشاط." />
          <Field name="maxFailures" label="عدد محاولات الدخول الخاطئة" def={current.maxFailures} hint="بعد هذا العدد من المحاولات الفاشلة يُقفل الدخول مؤقتاً." />
          <Field name="lockMinutes" label="مدة القفل (دقائق)" def={current.lockMinutes} hint="مدة منع الدخول بعد تجاوز المحاولات." />
        </div>

        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" className="btn-primary flex items-center gap-1.5"><Save size={16} /> حفظ</button>
            {saved && <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100"><Check size={13} /> تم الحفظ</span>}
          </div>
        )}
      </form>
    </div>
  );
}
