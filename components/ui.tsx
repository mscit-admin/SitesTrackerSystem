import { badge, progressColor } from "@/lib/format";

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "slate" | "emerald" | "sky" | "amber" | "red" | "brand";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    amber: "text-amber-600",
    red: "text-red-600",
    brand: "text-brand",
  };
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`stat-num mt-1 ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Badge({ status, label }: { status: string; label?: string }) {
  return <span className={`chip ${badge(status)}`}>{label ?? status}</span>;
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${progressColor(pct)}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-left text-xs tabular-nums text-slate-500">
        {pct}%
      </span>
    </div>
  );
}
