import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

const LEVEL_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const TREND_AR: Record<string, string> = {
  Increasing: "▲ متزايد",
  Stable: "■ مستقر",
  Decreasing: "▼ متناقص",
};

export default async function RisksPage() {
  const risks = await prisma.risk.findMany();
  risks.sort(
    (a, b) =>
      (LEVEL_ORDER[a.level ?? ""] ?? 9) - (LEVEL_ORDER[b.level ?? ""] ?? 9) ||
      (b.score ?? 0) - (a.score ?? 0)
  );

  const count = (l: string) => risks.filter((r) => r.level === l).length;

  return (
    <div>
      <PageHeader title="سجل المخاطر" subtitle={`${risks.length} مخاطرة مسجّلة`} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="حرجة" value={count("Critical")} tone="red" />
        <StatCard label="عالية" value={count("High")} tone="amber" />
        <StatCard label="متوسطة" value={count("Medium")} tone="sky" />
        <StatCard label="منخفضة" value={count("Low")} tone="emerald" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">المعرّف</th>
                <th className="th">المخاطرة</th>
                <th className="th">التصنيف</th>
                <th className="th">المواقع المتأثرة</th>
                <th className="th">الاحتمال</th>
                <th className="th">الأثر</th>
                <th className="th">الدرجة</th>
                <th className="th">المستوى</th>
                <th className="th">الاتجاه</th>
                <th className="th">صاحب الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {risks.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="td font-mono font-semibold">{r.riskId}</td>
                  <td className="td max-w-md whitespace-normal">
                    <div className="font-medium text-slate-800">{r.statement}</div>
                    {r.mitigation && (
                      <div className="mt-1 text-xs text-slate-400">التخفيف: {r.mitigation}</div>
                    )}
                  </td>
                  <td className="td">{r.category ?? "—"}</td>
                  <td className="td text-center">{fmtNum(r.affectedSites)}</td>
                  <td className="td text-center">{fmtNum(r.probability)}</td>
                  <td className="td text-center">{fmtNum(r.impact)}</td>
                  <td className="td text-center font-bold">{fmtNum(r.score)}</td>
                  <td className="td"><Badge status={r.level ?? "Low"} label={r.level ?? "—"} /></td>
                  <td className="td text-xs">{TREND_AR[r.trend ?? ""] ?? r.trend ?? "—"}</td>
                  <td className="td text-xs">{r.actionOwner ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
