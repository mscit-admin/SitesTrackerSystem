import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { stageBadge, stageLabel } from "@/lib/acquisition";
import { Plus, Compass } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = {
  OPEN: "مفتوحة", ACQUIRED: "مُستحوَذة", CANCELLED: "ملغاة",
};

export default async function AcquisitionPage() {
  const [points, openCount, acquiredCount, candTotal] = await Promise.all([
    prisma.nominalPoint.findMany({
      orderBy: { createdAt: "desc" },
      include: { candidates: { select: { stage: true } } },
    }),
    prisma.nominalPoint.count({ where: { status: "OPEN" } }),
    prisma.nominalPoint.count({ where: { status: "ACQUIRED" } }),
    prisma.candidateSite.count(),
  ]);

  return (
    <div>
      <PageHeader title="الاستحواذ" subtitle="اختيار المواقع واعتمادها عبر البوّابات الأربع حتى إنشاء الموقع">
        <Link href="/acquisition/new" className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> نقطة اسمية جديدة
        </Link>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="نقاط اسمية" value={points.length} tone="brand" icon={Compass} />
        <StatCard label="مفتوحة" value={openCount} tone="amber" />
        <StatCard label="مُستحوَذة" value={acquiredCount} tone="emerald" />
        <StatCard label="إجمالي المرشّحين" value={candTotal} tone="sky" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">المرجع</th>
                <th className="th">الاسم</th>
                <th className="th">المنطقة</th>
                <th className="th">المرشّحون</th>
                <th className="th">أعلى مرحلة</th>
                <th className="th">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {points.length === 0 && (
                <tr><td colSpan={6} className="td py-10 text-center text-gray-400">لا توجد نقاط اسمية بعد. ابدأ بإضافة نقطة.</td></tr>
              )}
              {points.map((p) => {
                const top = topStage(p.candidates.map((c) => c.stage));
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="td">
                      <Link href={`/acquisition/${p.id}`} className="font-mono font-semibold text-brand-light hover:underline">{p.ref}</Link>
                    </td>
                    <td className="td">{p.name ?? "—"}</td>
                    <td className="td text-gray-500">{p.region ?? "—"}</td>
                    <td className="td text-center">{p.candidates.length}</td>
                    <td className="td">{top ? <span className={`chip ${stageBadge(top)}`}>{stageLabel(top)}</span> : "—"}</td>
                    <td className="td">
                      <span className={`chip ${p.status === "ACQUIRED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {STATUS_AR[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const ORDER = ["REJECTED", "SUBMITTED", "APPROVED_CANDIDATE", "SURVEY_REQUESTED", "SURVEY_APPROVED", "SURVEYED", "TECH_APPROVED", "FINAL_APPROVED", "ACQUIRED"];
function topStage(stages: string[]): string | null {
  let best: string | null = null;
  let bestIdx = -1;
  for (const s of stages) {
    const i = ORDER.indexOf(s);
    if (i > bestIdx) { bestIdx = i; best = s; }
  }
  return best;
}
