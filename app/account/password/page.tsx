"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Check, AlertTriangle, ShieldAlert } from "lucide-react";
import { changeOwnPassword } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { PasswordFields } from "@/components/PasswordFields";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const forced = !!user?.mustChangePassword;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="تغيير كلمة المرور" subtitle="حدّث كلمة مرور حسابك" />

      {forced && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <ShieldAlert size={16} /> يجب تغيير كلمة المرور قبل متابعة استخدام النظام.
        </div>
      )}

      <form
        className="card space-y-3 p-5"
        action={async (fd) => {
          setMsg(null);
          const res = await changeOwnPassword(fd);
          if (res.ok) {
            setMsg({ ok: true, text: "تم تغيير كلمة المرور" });
            (document.getElementById("pwform") as HTMLFormElement)?.reset();
            // refresh so the mustChangePassword flag clears; leave the forced screen
            router.replace(forced ? "/" : "/account/password");
            router.refresh();
          } else {
            setMsg({ ok: false, text: res.error ?? "تعذّر" });
          }
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
          <input name="current" type="password" required className="field w-full" dir="ltr" autoComplete="current-password" />
        </div>
        <PasswordFields
          newName="next"
          confirmName="confirm"
          newLabel="كلمة المرور الجديدة"
          hint="8 أحرف على الأقل، وتحتوي على حرف ورقم."
        />
        <button type="submit" className="btn-primary flex items-center gap-1.5"><KeyRound size={16} /> حفظ</button>
      </form>
    </div>
  );
}
