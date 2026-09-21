"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "لوحة المؤشرات", icon: "▦" },
  { href: "/sites", label: "المواقع", icon: "📡" },
  { href: "/maintenance", label: "التشغيل والصيانة", icon: "🛠" },
  { href: "/risks", label: "سجل المخاطر", icon: "⚠" },
];

export function Sidebar() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-col bg-brand text-white md:w-60">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-4 md:px-5">
        <span className="text-2xl">🗼</span>
        <div className="hidden md:block">
          <div className="text-sm font-bold leading-tight">GSDN Tracker</div>
          <div className="text-[11px] text-white/60">متابعة مواقع الاتصالات</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2 md:p-3">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              isActive(n.href)
                ? "bg-white/15 font-semibold"
                : "text-white/75 hover:bg-white/10"
            }`}
          >
            <span className="text-lg">{n.icon}</span>
            <span className="hidden md:inline">{n.label}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3 text-[11px] text-white/50">
        <div className="hidden md:block">شركة الجيل الجديد — aat</div>
        <div className="hidden md:block">شبكة البيانات الحكومية الآمنة</div>
      </div>
    </aside>
  );
}
