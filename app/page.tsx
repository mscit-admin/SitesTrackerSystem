import Link from "next/link";
import { getDashboard } from "@/lib/queries";
import { PageHeader, StatCard, ProgressBar } from "@/components/ui";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboard();
  const maxFunnel = Math.max(1, ...d.funnel.map((f) => f.done + f.inProgress + f.notStarted));

  return (
    <div>
      <PageHeader
        title="لوحة المؤشرات"
        subtitle="نظرة شاملة على تقدّم مواقع مشروع GSDN عبر دورة الحياة الكاملة"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="إجمالي المواقع" value={fmtNum(d.total)} tone="brand" />
        <StatCard label="نسبة الإنجاز" value={`${d.avgProgress}%`} tone="sky" sub="متوسط عبر المشروع" />
        <StatCard label="على الهواء" value={fmtNum(d.onair)} tone="sky" sub={`${Math.round((d.onair / d.total) * 100)}% من المواقع`} />
        <StatCard label="مُسلّمة للتشغيل" value={fmtNum(d.inOperation)} tone="emerald" />
        <StatCard label="قيد التنفيذ" value={fmtNum(d.inProgress + d.notStarted)} tone="amber" />
        <StatCard label="مشاكل مفتوحة" value={fmtNum(d.openIssues)} tone="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lifecycle funnel */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-800">قمع دورة الحياة (Lifecycle Funnel)</h2>
          <div className="space-y-2">
            {d.funnel.map((f) => {
              const active = f.done + f.inProgress + f.notStarted;
              const w = (n: number) => `${(n / maxFunnel) * 100}%`;
              return (
                <div key={f.code} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate text-xs text-slate-600" title={f.ar}>
                    {f.ar}
                  </div>
                  <div className="flex h-6 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className="bg-emerald-500" style={{ width: w(f.done) }} title={`مكتمل ${f.done}`} />
                    <div className="bg-amber-400" style={{ width: w(f.inProgress) }} title={`قيد التنفيذ ${f.inProgress}`} />
                    <div className="bg-slate-300" style={{ width: w(f.notStarted) }} title={`لم يبدأ ${f.notStarted}`} />
                  </div>
                  <div className="w-24 shrink-0 text-left text-xs tabular-nums text-slate-500">
                    <span className="font-semibold text-emerald-600">{f.done}</span>
                    {" / "}
                    {active}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-emerald-500" /> مكتمل</span>
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-amber-400" /> قيد التنفيذ</span>
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-slate-300" /> لم يبدأ</span>
            <span className="text-slate-400">(المراحل غير المطلوبة مستبعدة)</span>
          </div>
        </div>

        {/* Risks + Maintenance */}
        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">المخاطر</h2>
              <Link href="/risks" className="text-xs text-brand-light hover:underline">عرض السجل ←</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RiskPill label="حرجة" n={d.risks.critical} cls="bg-red-50 text-red-700 border-red-200" />
              <RiskPill label="عالية" n={d.risks.high} cls="bg-orange-50 text-orange-700 border-orange-200" />
              <RiskPill label="متوسطة" n={d.risks.medium} cls="bg-amber-50 text-amber-700 border-amber-200" />
              <RiskPill label="منخفضة" n={d.risks.low} cls="bg-emerald-50 text-emerald-700 border-emerald-200" />
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">التشغيل والصيانة</h2>
              <Link href="/maintenance" className="text-xs text-brand-light hover:underline">التفاصيل ←</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RiskPill label="صيانة متأخرة" n={d.pmOverdue} cls="bg-red-50 text-red-700 border-red-200" />
              <RiskPill label="بلاغات مفتوحة" n={d.ticketsOpen} cls="bg-sky-50 text-sky-700 border-sky-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Region rollup */}
      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-800">التقدّم حسب المنطقة</h2>
        </div>
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">المنطقة</th>
                <th className="th">إجمالي المواقع</th>
                <th className="th">على الهواء</th>
                <th className="th">مُسلّمة</th>
                <th className="th w-56">نسبة الإنجاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.regionRows.map((r) => (
                <tr key={r.region} className="hover:bg-slate-50">
                  <td className="td font-semibold">{r.region}</td>
                  <td className="td">{fmtNum(r.total)}</td>
                  <td className="td text-sky-600">{fmtNum(r.onair)}</td>
                  <td className="td text-emerald-600">{fmtNum(r.handed)}</td>
                  <td className="td"><ProgressBar pct={r.progress} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RiskPill({ label, n, cls }: { label: string; n: number; cls: string }) {
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-2xl font-bold tabular-nums">{n}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
