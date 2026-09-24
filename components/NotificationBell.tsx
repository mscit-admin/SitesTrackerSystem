"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, AlertTriangle, Info, Trash2 } from "lucide-react";
import { markNotificationsRead, clearNotifications } from "@/app/actions/notifications";

export interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
  read: boolean;
}

export function NotificationBell({ items }: { items: NotifItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markNotificationsRead();
      router.refresh();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100" title="الإشعارات">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-30 mt-1.5 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-pop" dir="rtl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-semibold text-gray-800">الإشعارات</span>
            {items.length > 0 && (
              <button
                onClick={async () => { await clearNotifications(); router.refresh(); }}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600"
              >
                <Trash2 size={12} /> مسح الكل
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scroll-slim">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-gray-400">لا توجد إشعارات.</div>
            ) : (
              items.map((n) => {
                const Icon = n.type === "account_disabled" ? AlertTriangle : Info;
                const tone = n.type === "account_disabled" ? "text-red-500" : "text-amber-500";
                return (
                  <div key={n.id} className={`flex gap-2 border-b border-gray-50 px-3 py-2.5 ${n.read ? "" : "bg-brand/5"}`}>
                    <Icon size={16} className={`mt-0.5 shrink-0 ${tone}`} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-800">{n.title}</div>
                      {n.body && <div className="mt-0.5 text-[12px] leading-relaxed text-gray-600">{n.body}</div>}
                      <div className="mt-1 text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleString("ar")}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
