"use client";

import { useState } from "react";
import { KeyRound, Save, Check } from "lucide-react";
import { savePasswordPolicy } from "@/app/settings/actions";
import type { PasswordPolicy } from "@/lib/passwordPolicy";

type Lang = { code: string; name: string; script: string };

export function PasswordPolicySettings({
  current, languages, canEdit,
}: {
  current: PasswordPolicy; languages: Lang[]; canEdit: boolean;
}) {
  const [saved, setSaved] = useState(false);

  const Num = ({ name, label, def }: { name: string; label: string; def: number }) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input name={name} type="number" min={0} defaultValue={def} disabled={!canEdit}
        className="field w-full disabled:bg-gray-100 disabled:text-gray-400" />
    </div>
  );
  const Check1 = ({ name, label, def }: { name: string; label: string; def: boolean }) => (
    <label className="flex items-center gap-2 text-[13px] text-gray-700">
      <input name={name} type="checkbox" defaultChecked={def} disabled={!canEdit} className="h-4 w-4 rounded border-gray-300 text-brand" />
      {label}
    </label>
  );

  const scriptAr: Record<string, string> = { latin: "لاتينية", arabic: "عربية", cyrillic: "سيريلية" };

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900">
        <KeyRound size={16} className="text-brand" /> قوة كلمة المرور
      </h2>
      <p className="mb-4 text-xs text-gray-500">حدّد متطلبات كلمة المرور المطبّقة عند إنشائها أو تغييرها.</p>

      <form
        action={async (fd) => {
          const res = await savePasswordPolicy(fd);
          if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
        }}
      >
        <input type="hidden" name="langCodes" value={languages.map((l) => l.code).join(",")} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Num name="minLength" label="أقل عدد للأحرف" def={current.minLength} />
          <Num name="minLetters" label="أقل عدد للحروف" def={current.minLetters} />
          <Num name="minDigits" label="أقل عدد للأرقام" def={current.minDigits} />
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-gray-600">نوع الحروف والرموز</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Check1 name="requireUppercase" label="إلزام حرف لاتيني كبير (A-Z)" def={current.requireUppercase} />
            <Check1 name="requireLowercase" label="إلزام حرف لاتيني صغير (a-z)" def={current.requireLowercase} />
            <Check1 name="allowSymbols" label="السماح باستخدام الرموز (@ # $ …)" def={current.allowSymbols} />
            <Check1 name="requireSymbol" label="إلزام رمز واحد على الأقل" def={current.requireSymbol} />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-gray-600">لغة حروف كلمة المرور (حسب لغات النظام)</div>
          <p className="mb-2 text-[11px] text-gray-400">حدّد أي لغات يُسمح باستخدام حروفها داخل كلمات المرور. أي لغة تُضاف للنظام تظهر هنا تلقائياً.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {languages.map((l) => (
              <label key={l.code} className="flex items-center gap-2 rounded-md border border-gray-100 px-2.5 py-1.5 text-[13px] text-gray-700">
                <input
                  name={`lang_${l.code}`}
                  type="checkbox"
                  defaultChecked={current.langLetters[l.code] !== false}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-gray-300 text-brand"
                />
                <span>{l.name}</span>
                <span className="text-[10px] text-gray-400">({scriptAr[l.script] ?? l.script})</span>
              </label>
            ))}
          </div>
        </div>

        {canEdit && (
          <div className="mt-5 flex items-center gap-3">
            <button type="submit" className="btn-primary flex items-center gap-1.5"><Save size={16} /> حفظ</button>
            {saved && <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100"><Check size={13} /> تم الحفظ</span>}
          </div>
        )}
      </form>
    </div>
  );
}
