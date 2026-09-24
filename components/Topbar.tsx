"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/LocaleProvider";

const LABEL_KEY: Record<string, string> = {
  "": "nav.dashboard",
  acquisition: "nav.acquisition",
  sites: "nav.sites",
  maintenance: "nav.maintenance",
  risks: "nav.risks",
  deletions: "nav.deletions",
  users: "nav.users",
  account: "account.profile",
  settings: "nav.settings",
};

export function Topbar() {
  const path = usePathname();
  const t = useT();
  const seg = path.split("/").filter(Boolean);
  const section = t(LABEL_KEY[seg[0] ?? ""] ?? "nav.dashboard");
  const isDetail = seg[0] === "sites" && seg.length > 1;

  return (
    <header className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <nav className="flex items-center gap-1.5 text-[13px] text-gray-500">
        <Link href="/" className="hover:text-gray-800">{t("common.home")}</Link>
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
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
