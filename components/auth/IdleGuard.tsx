"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { logout } from "@/app/actions/auth";

// Logs the user out after `idleMinutes` of no activity, saving unsaved form work
// as a draft first (via the global "draft:flush" event). Shows a warning one
// minute before.
export function IdleGuard({ idleMinutes }: { idleMinutes: number }) {
  const { user } = useAuth();
  const [warn, setWarn] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const idleMs = Math.max(1, idleMinutes) * 60_000;
    const warnMs = Math.max(0, idleMs - 60_000);

    const endSession = async () => {
      try {
        window.dispatchEvent(new Event("draft:flush")); // persist unsaved work
        localStorage.setItem("gsdn:sessionTimedOut", "1");
      } catch { /* ignore */ }
      await logout(); // clears session + redirects to /login
    };

    const reset = () => {
      setWarn(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      warnTimer.current = setTimeout(() => setWarn(true), warnMs);
      idleTimer.current = setTimeout(endSession, idleMs);
    };

    const activity = () => reset();
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    let throttle = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - throttle < 1000) return; // throttle resets
      throttle = now;
      activity();
    };
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, idleMinutes]);

  if (!warn) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 shadow-pop" dir="rtl">
      <span className="flex items-center gap-2">
        <AlertTriangle size={16} /> ستُنهى الجلسة قريباً لعدم النشاط — سيُحفظ عملك غير المكتمل كمسودة تلقائياً.
      </span>
    </div>
  );
}
