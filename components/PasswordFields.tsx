"use client";

import { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";

// A "new password" + "confirm" pair with show/hide toggles and a live
// match indicator that updates as you type. Values submit via the given names.
export function PasswordFields({
  newName,
  confirmName,
  newLabel,
  confirmLabel = "تأكيد كلمة المرور",
  hint,
}: {
  newName: string;
  confirmName: string;
  newLabel: string;
  confirmLabel?: string;
  hint?: string;
}) {
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);

  const match = cf.length > 0 && pw === cf;
  const mismatch = cf.length > 0 && pw !== cf;

  const Toggle = ({ show, set }: { show: boolean; set: (v: boolean) => void }) => (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => set(!show)}
      aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
      className="absolute inset-y-0 left-2 flex items-center text-gray-400 hover:text-gray-600"
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">{newLabel}</label>
        <div className="relative">
          <input
            name={newName}
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="field w-full pl-9"
            dir="ltr"
          />
          <Toggle show={showPw} set={setShowPw} />
        </div>
        {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">{confirmLabel}</label>
        <div className="relative">
          <input
            name={confirmName}
            type={showCf ? "text" : "password"}
            value={cf}
            onChange={(e) => setCf(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={mismatch}
            className={`field w-full pl-9 ${mismatch ? "border-red-300 focus:border-red-400" : match ? "border-emerald-300 focus:border-emerald-400" : ""}`}
            dir="ltr"
          />
          <Toggle show={showCf} set={setShowCf} />
        </div>
        {mismatch && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
            <X size={12} /> كلمتا المرور غير متطابقتين
          </p>
        )}
        {match && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
            <Check size={12} /> كلمتا المرور متطابقتان
          </p>
        )}
      </div>
    </>
  );
}
