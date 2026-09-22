"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { setSitesPageSize } from "@/app/settings/actions";
import { PAGE_SIZE_OPTIONS } from "@/lib/queries";

export function PageSizeSetting({ current }: { current: number }) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold text-gray-900">إعدادات العرض</h2>
      <p className="mt-0.5 text-xs text-gray-500">العدد الافتراضي للصفوف في قائمة المواقع (يمكن تغييره مؤقتاً من شاشة المواقع).</p>

      <form
        action={async (fd) => {
          await setSitesPageSize(fd);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="mt-4 flex items-center gap-2"
      >
        <label className="text-sm text-gray-700">عدد الصفوف الافتراضي:</label>
        <select name="value" defaultValue={String(current)} className="field py-1.5">
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary">حفظ</button>
        {saved && (
          <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100">
            <Check size={13} /> تم الحفظ
          </span>
        )}
      </form>
    </div>
  );
}
