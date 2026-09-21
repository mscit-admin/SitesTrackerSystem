import { badge, progressColor } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const TONES: Record<string, { text: string; iconBg: string; iconFg: string }> = {
  slate: { text: "text-gray-900", iconBg: "bg-gray-100", iconFg: "text-gray-500" },
  brand: { text: "text-gray-900", iconBg: "bg-brand-soft", iconFg: "text-brand" },
  sky: { text: "text-gray-900", iconBg: "bg-sky-50", iconFg: "text-sky-600" },
  emerald: { text: "text-gray-900", iconBg: "bg-emerald-50", iconFg: "text-emerald-600" },
  amber: { text: "text-gray-900", iconBg: "bg-amber-50", iconFg: "text-amber-600" },
  red: { text: "text-gray-900", iconBg: "bg-red-50", iconFg: "text-red-600" },
};

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "slate" | "emerald" | "sky" | "amber" | "red" | "brand";
  icon?: LucideIcon;
}) {
  const t = TONES[tone];
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-gray-500">{label}</div>
          <div className={`stat-num mt-2 ${t.text}`}>{value}</div>
          {sub && <div className="mt-1.5 text-xs text-gray-400">{sub}</div>}
        </div>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${t.iconBg}`}>
            <Icon size={18} strokeWidth={1.75} className={t.iconFg} />
          </span>
        )}
      </div>
    </div>
  );
}

export function Badge({ status, label }: { status: string; label?: string }) {
  return <span className={`chip ${badge(status)}`}>{label ?? status}</span>;
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${progressColor(pct)}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-left text-xs tabular-nums text-gray-500">
        {pct}%
      </span>
    </div>
  );
}
