"use client";

import { useState } from "react";
import { ScrollText, Save, Check } from "lucide-react";
import { saveAuditRetention } from "@/app/settings/actions";

export function AuditRetentionSettings({ current, canEdit }: { current: number; canEdit: boolean }) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900">
        <ScrollText size={16} className="text-brand" /> مدة حفظ سجل التدقيق
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        تُحذف السجلات الأقدم من هذه المدة تلقائياً. اكتب <span className="font-mono">0</span> للحفظ الدائم بلا حذف.
      </p>
      <form
        action={async (fd) => {
          const res = await saveAuditRetention(fd);
          if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">المدة (بالأشهر)</label>
          <input name="months" type="number" min={0} max={600} defaultValue={current} disabled={!canEdit}
            className="field w-40 disabled:bg-gray-100 disabled:text-gray-400" />
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary flex items-center gap-1.5"><Save size={16} /> حفظ</button>
            {saved && <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100"><Check size={13} /> تم الحفظ</span>}
          </div>
        )}
      </form>
    </div>
  );
}
