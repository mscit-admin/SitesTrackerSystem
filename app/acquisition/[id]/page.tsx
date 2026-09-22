import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CandidateForm } from "@/components/CandidateForm";
import { CandidateCard } from "@/components/CandidateCard";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = { OPEN: "مفتوحة", ACQUIRED: "مُستحوَذة", CANCELLED: "ملغاة" };

export default async function NominalPointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const np = await prisma.nominalPoint.findUnique({
    where: { id },
    include: { candidates: { orderBy: { createdAt: "asc" } } },
  });
  if (!np) notFound();

  const candidates = np.candidates.map((c) => ({
    ...c,
    surveyDate: c.surveyDate ? c.surveyDate.toISOString().slice(0, 10) : null,
    candidateApprovedAt: undefined,
    surveyPermittedAt: undefined,
    techApprovedAt: undefined,
    finalApprovedAt: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  }));

  const activeCount = candidates.filter((c) => c.stage !== "REJECTED").length;

  return (
    <div>
      <div className="mb-5">
        <Link href="/acquisition" className="text-sm text-gray-400 hover:text-gray-600">← رجوع للاستحواذ</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <span className="font-mono text-brand">{np.ref}</span>
              <span>{np.name ?? "نقطة اسمية"}</span>
            </h1>
            <div className="mt-1 text-[13px] text-gray-500">
              {np.region ?? "—"}
              {np.latitude && np.longitude && <> · {np.latitude}, {np.longitude}</>}
            </div>
          </div>
          <span className={`chip ${np.status === "ACQUIRED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
            {STATUS_AR[np.status] ?? np.status}
          </span>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-1 text-base font-semibold text-gray-900">إضافة مرشّح</h2>
        <p className="mb-4 text-xs text-gray-500">
          يبحث المالك (AAT) ويختار حتى 3 مرشّحين. الأولوية لشركات القطاع، ثم المواطنون/أخرى.
          {activeCount >= 3 && <span className="mr-1 text-amber-600">— بلغت 3 مرشّحين نشطين.</span>}
        </p>
        <CandidateForm nominalPointId={np.id} />
      </div>

      <h2 className="mb-3 text-base font-semibold text-gray-900">المرشّحون ({candidates.length})</h2>
      {candidates.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400">لا يوجد مرشّحون بعد.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {candidates.map((c) => (
            <CandidateCard key={c.id} c={c as any} />
          ))}
        </div>
      )}
    </div>
  );
}
