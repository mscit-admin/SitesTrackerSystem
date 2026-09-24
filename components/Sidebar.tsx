"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Antenna,
  Wrench,
  ShieldAlert,
  Compass,
  Settings,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useT } from "@/components/i18n/LocaleProvider";

const NAV: { href: string; label: string; icon: LucideIcon; perm?: string }[] = [
  { href: "/", label: "لوحة المؤشرات", icon: LayoutDashboard, perm: "dashboard.view" },
  { href: "/acquisition", label: "الاستحواذ", icon: Compass, perm: "acquisition.view" },
  { href: "/sites", label: "المواقع", icon: Antenna, perm: "sites.view" },
  { href: "/maintenance", label: "التشغيل والصيانة", icon: Wrench, perm: "maintenance.view" },
  { href: "/risks", label: "سجل المخاطر", icon: ShieldAlert, perm: "risks.view" },
  { href: "/deletions", label: "طلبات الحذف", icon: Trash2, perm: "deletions.view" },
  { href: "/users", label: "المستخدمون والصلاحيات", icon: Users, perm: "users.view" },
  { href: "/settings", label: "الإعدادات", icon: Settings, perm: "settings.view" },
];

export function Sidebar() {
  const path = usePathname();
  const { can } = useAuth();
  const t = useT();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);
  const nav = NAV.filter((n) => !n.perm || can(n.perm));

  return (
    <aside className="sticky top-0 z-20 flex h-screen w-16 shrink-0 flex-col border-l border-gray-200 bg-white md:w-60">
      {/* App header */}
      <div className="flex h-[52px] items-center gap-2.5 border-b border-gray-200 px-3 md:px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
          aat
        </div>
        <div className="hidden md:block">
          <div className="text-[13px] font-semibold leading-tight text-gray-900">
            GSDN Tracker
          </div>
          <div className="text-[11px] text-gray-500">{t("متابعة مواقع الاتصالات")}</div>
        </div>
      </div>

      {/* Workspace nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2 md:p-3">
        <div className="mb-1 hidden px-2 text-[11px] font-medium uppercase tracking-wide text-gray-400 md:block">
          {t("مساحة العمل")}
        </div>
        {nav.map((n) => {
          const active = isActive(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              title={t(n.label)}
              className={`group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] transition ${
                active
                  ? "bg-gray-100 font-semibold text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {active && (
                <span className="absolute inset-y-1.5 right-0 w-0.5 rounded-full bg-brand" />
              )}
              <Icon
                size={18}
                strokeWidth={1.75}
                className={active ? "text-brand" : "text-gray-500 group-hover:text-gray-700"}
              />
              <span className="hidden md:inline">{t(n.label)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 text-[11px] leading-relaxed text-gray-400">
        <div className="hidden md:block">{t("شركة الجيل الجديد — aat")}</div>
        <div className="hidden md:block">{t("شبكة البيانات الحكومية الآمنة")}</div>
      </div>
    </aside>
  );
}
