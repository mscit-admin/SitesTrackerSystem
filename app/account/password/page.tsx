"use client";

import { useState } from "react";
import { KeyRound, Check, AlertTriangle } from "lucide-react";
import { changeOwnPassword } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";

export default function ChangePasswordPage() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="تغيير كلمة المرور" subtitle="حدّث كلمة مرور حسابك" />
      <form
        className="card space-y-3 p-5"
        action={async (fd) => {
          setMsg(null);
          const res = await changeOwnPassword(fd);
          setMsg(res.ok ? { ok: true, text: "تم تغيير كلمة المرور" } : { ok: false, text: res.error ?? "تعذّر" });
          if (res.ok) (document.getElementById("pwform") as HTMLFormElement)?.reset();
        }}
        id="pwform"
      >
        {msg && (
          <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${msg.ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700"}`}>
            {msg.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {msg.text}
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">كلمة المرور الحالية</label>
          <input name="current" type="password" required className="field w-full" dir="ltr" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">كلمة المرور الجديدة</label>
          <input name="next" type="password" required minLength={8} className="field w-full" dir="ltr" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">تأكيد كلمة المرور</label>
          <input name="confirm" type="password" required minLength={8} className="field w-full" dir="ltr" />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-1.5"><KeyRound size={16} /> حفظ</button>
      </form>
    </div>
  );
}
