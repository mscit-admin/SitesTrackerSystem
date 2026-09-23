"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { IdleGuard } from "@/components/auth/IdleGuard";

// Public routes render without the app chrome (sidebar / topbar).
const BARE_PREFIXES = ["/login"];

export function AppShell({ children, idleMinutes }: { children: React.ReactNode; idleMinutes: number }) {
  const path = usePathname();
  const bare = BARE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (bare) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <IdleGuard idleMinutes={idleMinutes} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
