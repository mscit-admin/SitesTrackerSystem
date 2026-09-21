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

// Frappe/ERPNext-style soft indicator pills (static classes so JIT keeps them).
export const STATUS_BADGE: Record<string, string> = {
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-100",
  NOT_STARTED: "bg-gray-100 text-gray-600 border-gray-200",
  NA: "bg-gray-100 text-gray-400 border-gray-200",
  BLOCKED: "bg-red-50 text-red-700 border-red-100",
  ONAIR: "bg-brand-soft text-brand-dark border-blue-100",
  HANDED_OVER: "bg-emerald-50 text-emerald-700 border-emerald-100",
  IN_OPERATION: "bg-emerald-50 text-emerald-700 border-emerald-100",
  OPEN: "bg-red-50 text-red-700 border-red-100",
  CLOSED: "bg-gray-100 text-gray-500 border-gray-200",
  Critical: "bg-red-50 text-red-700 border-red-100",
  High: "bg-orange-50 text-orange-700 border-orange-100",
  Medium: "bg-amber-50 text-amber-700 border-amber-100",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export function badge(status: string): string {
  return STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

export function progressColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60) return "bg-brand";
  if (pct >= 30) return "bg-amber-500";
  return "bg-gray-400";
}
