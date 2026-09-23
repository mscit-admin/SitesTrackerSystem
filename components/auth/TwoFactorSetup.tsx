"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Loader2, Check, AlertTriangle } from "lucide-react";
import { begin2fa, enable2fa, disable2fa } from "@/app/actions/twofactor";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (enabled) {
    return (
      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <ShieldCheck size={16} /> المصادقة الثنائية مفعّلة على حسابك.
        </div>
        <form
          action={async (fd) => {
            setError(null);
            const res = await disable2fa(fd);
            if (res.ok) router.refresh(); else setError(res.error ?? "تعذّر");
          }}
          className="space-y-3"
        >
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <p className="text-xs text-gray-500">لتعطيلها، أدخل كلمة مرور حسابك.</p>
          <input name="password" type="password" required placeholder="كلمة المرور" className="field w-full" dir="ltr" />
          <button className="btn-ghost flex items-center gap-1.5 text-red-600"><ShieldOff size={15} /> تعطيل 2FA</button>
        </form>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-5">
      {!qr ? (
        <>
          <p className="text-sm text-gray-600">
            فعّل المصادقة الثنائية باستخدام تطبيق مثل Google Authenticator أو Authy. عند كل دخول ستُدخل رمزاً مؤقتاً من التطبيق.
          </p>
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); setError(null); const r = await begin2fa(); setBusy(false); if (r.ok) { setQr(r.qr!); setSecret(r.secret!); } else setError(r.error ?? "تعذّر"); }}
            className="btn-primary flex items-center gap-1.5"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} بدء التفعيل
          </button>
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </>
      ) : (
        <>
          <ol className="list-decimal space-y-2 pr-4 text-sm text-gray-700">
            <li>امسح رمز QR بتطبيق المصادقة.</li>
            <li>أدخل الرمز المكوّن من 6 أرقام لتأكيد التفعيل.</li>
          </ol>
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR" className="rounded-lg border border-gray-200" />
            {secret && (
              <code className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-600" dir="ltr">{secret}</code>
            )}
          </div>
          <form
            action={async (fd) => {
              setError(null);
              const res = await enable2fa(fd);
              if (res.ok) router.refresh(); else setError(res.error ?? "تعذّر");
            }}
            className="space-y-3"
          >
            {error && <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle size={15} /> {error}</div>}
            <input name="token" inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" className="field w-full text-center tracking-[0.4em]" dir="ltr" />
            <button className="btn-primary flex items-center gap-1.5"><Check size={16} /> تأكيد وتفعيل</button>
          </form>
        </>
      )}
    </div>
  );
}
