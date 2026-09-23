"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { login } from "@/app/actions/auth";

// Only redirect to same-origin paths after login.
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState("/");
  const [need2fa, setNeed2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setNext(safeNext(params.get("next")));
      if (localStorage.getItem("gsdn:sessionTimedOut") === "1") {
        setTimedOut(true);
        localStorage.removeItem("gsdn:sessionTimedOut");
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            aat
          </div>
          <h1 className="text-lg font-bold text-gray-900">نظام متابعة مواقع GSDN</h1>
          <p className="mt-1 text-xs text-gray-500">سجّل الدخول للمتابعة</p>
        </div>

        <form
          className="card space-y-4 p-6"
          action={async (fd) => {
            setPending(true);
            setError(null);
            const res = await login(fd);
            setPending(false);
            if (res.ok) {
              router.replace(next);
              router.refresh();
              return;
            }
            if (res.need2fa) setNeed2fa(true);
            if (res.error) setError(res.error);
          }}
        >
          {timedOut && !error && (
            <div className="flex items-center gap-2 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <Clock size={15} /> انتهت الجلسة لعدم النشاط. تم حفظ عملك غير المكتمل كمسودة.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">البريد الإلكتروني أو الرقم الوظيفي</label>
            <input name="identifier" autoFocus required className="field w-full" dir="ltr" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">كلمة المرور</label>
            <input name="password" type="password" required className="field w-full" dir="ltr" />
          </div>

          {need2fa && (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <ShieldCheck size={14} /> رمز التحقق (2FA)
              </label>
              <input
                name="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="field w-full text-center tracking-[0.4em]"
                dir="ltr"
              />
              <p className="mt-1 text-[11px] text-gray-400">أدخل الرمز من تطبيق المصادقة (Google Authenticator / Authy).</p>
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary flex w-full items-center justify-center gap-2">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {pending ? "جارٍ الدخول…" : "دخول"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-gray-400">© شركة الجيل الجديد — GSDN</p>
      </div>
    </div>
  );
}
