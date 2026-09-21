// Small formatting helpers used across the UI.

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-LY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("ar-LY", {
    maximumFractionDigits: digits,
  }).format(n);
}

// Tailwind-safe status colour classes (kept static so JIT keeps them).
export const STATUS_BADGE: Record<string, string> = {
  DONE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  NOT_STARTED: "bg-slate-100 text-slate-700 border-slate-200",
  NA: "bg-zinc-100 text-zinc-500 border-zinc-200",
  BLOCKED: "bg-red-100 text-red-800 border-red-200",
  ONAIR: "bg-sky-100 text-sky-800 border-sky-200",
  HANDED_OVER: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_OPERATION: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OPEN: "bg-red-100 text-red-800 border-red-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
  Critical: "bg-red-100 text-red-800 border-red-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function badge(status: string): string {
  return STATUS_BADGE[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

export function progressColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60) return "bg-sky-500";
  if (pct >= 30) return "bg-amber-500";
  return "bg-slate-400";
}
