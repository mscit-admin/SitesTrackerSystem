"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  "": "لوحة المؤشرات",
  acquisition: "الاستحواذ",
  sites: "المواقع",
  maintenance: "التشغيل والصيانة",
  risks: "سجل المخاطر",
  deletions: "طلبات الحذف",
  settings: "الإعدادات",
};

export function Topbar() {
  const path = usePathname();
  const seg = path.split("/").filter(Boolean);
  const section = LABELS[seg[0] ?? ""] ?? "لوحة المؤشرات";
  const isDetail = seg[0] === "sites" && seg.length > 1;

  return (
    <header className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <nav className="flex items-center gap-1.5 text-[13px] text-gray-500">
        <Link href="/" className="hover:text-gray-800">الرئيسية</Link>
        {seg.length > 0 && (
          <>
            <span className="text-gray-300">/</span>
            {isDetail ? (
              <Link href="/sites" className="hover:text-gray-800">{section}</Link>
            ) : (
              <span className="font-medium text-gray-800">{section}</span>
            )}
          </>
        )}
        {isDetail && (
          <>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-800">تفاصيل الموقع</span>
          </>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] text-gray-400 sm:inline">GSDN Project</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          م
        </div>
      </div>
    </header>
  );
}
