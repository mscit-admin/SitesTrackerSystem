"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, KeyRound, ShieldCheck, ChevronDown, UserCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { logout } from "@/app/actions/auth";

export function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;
  const initials = user.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "؟";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-0.5 pe-2 ps-0.5 hover:bg-gray-100"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {initials}
          </span>
        )}
        <span className="hidden text-[12px] font-medium text-gray-700 sm:inline">{user.fullName}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-pop" dir="rtl">
          <div className="border-b border-gray-100 px-3 py-2.5">
            <div className="text-sm font-semibold text-gray-900">{user.fullName}</div>
            <div className="text-[11px] text-gray-500">{user.email}</div>
            {user.roleName && <div className="mt-0.5 text-[11px] text-brand">{user.roleName}</div>}
          </div>
          <Link href="/account/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
            <UserCircle size={15} /> الملف الشخصي والصورة
          </Link>
          <Link href="/account/password" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
            <KeyRound size={15} /> تغيير كلمة المرور
          </Link>
          <Link href="/account/2fa" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
            <ShieldCheck size={15} /> المصادقة الثنائية (2FA)
            {user.twoFactorEnabled && <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100 !py-0 text-[10px]">مفعّلة</span>}
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50">
              <LogOut size={15} /> تسجيل الخروج
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
