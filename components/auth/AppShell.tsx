"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { IdleGuard } from "@/components/auth/IdleGuard";
import { Localize } from "@/components/i18n/Localize";
import type { NotifItem } from "@/components/NotificationBell";

// Public routes render without the app chrome (sidebar / topbar).
const BARE_PREFIXES = ["/login"];

export function AppShell({
  children, idleMinutes, notifications,
}: {
  children: React.ReactNode; idleMinutes: number; notifications: NotifItem[];
}) {
  const path = usePathname();
  const bare = BARE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (bare) return <><Localize />{children}</>;

  return (
    <div className="flex min-h-screen">
      <Localize />
      <IdleGuard idleMinutes={idleMinutes} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar notifications={notifications} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
