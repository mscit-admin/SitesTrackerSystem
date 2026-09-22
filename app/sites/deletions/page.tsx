import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { RejectDeletionForm } from "@/components/RejectDeletionForm";
import { approveDeletionPhase, approveDeletionPM } from "@/app/sites/actions";
import { fmtDate } from "@/lib/format";
import { ClipboardCheck, Clock, Trash2, Ban } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { ar: string; cls: string }> = {
  PENDING: { ar: "بانتظار مسؤول المرحلة", cls: "bg-amber-50 text-amber-700 border-amber-100" },
  PHASE_APPROVED: { ar: "بانتظار مدير المشروع", cls: "bg-sky-50 text-sky-700 border-sky-100" },
  COMPLETED: { ar: "تم الحذف", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  REJECTED: { ar: "مرفوض", cls: "bg-red-50 text-red-700 border-red-100" },
};

export default async function DeletionsPage() {
  const [requests, pending, phase, done] = await Promise.all([
    prisma.siteDeletionRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.siteDeletionRequest.count({ where: { status: "PENDING" } }),
    prisma.siteDeletionRequest.count({ where: { status: "PHASE_APPROVED" } }),
    prisma.siteDeletionRequest.count({ where: { status: "COMPLETED" } }),
  ]);

  return (
    <div>
      <div className="mb-5">
        <Link href="/sites" className="text-sm text-gray-400 hover:text-gray-600">← رجوع للمواقع</Link>
      </div>
      <PageHeader title="طلبات حذف المواقع" subtitle="الحذف يتطلب موافقة مسؤول المرحلة ثم مدير المشروع" />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="بانتظار مسؤول المرحلة" value={pending} tone="amber" icon={Clock} />
        <StatCard label="بانتظار مدير المشروع" value={phase} tone="sky" icon={ClipboardCheck} />
        <StatCard label="تم حذفها" value={done} tone="slate" icon={Trash2} />
        <StatCard label="إجمالي الطلبات" value={requests.length} tone="brand" icon={Ban} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">الموقع</th>
                <th className="th">سبب الحذف</th>
                <th className="th">الحالة</th>
                <th className="th">التاريخ</th>
                <th className="th">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 && (
                <tr><td colSpan={5} className="td py-10 text-center text-gray-400">لا توجد طلبات حذف.</td></tr>
              )}
              {requests.map((r) => {
                const st = STATUS[r.status] ?? { ar: r.status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                return (
                  <tr key={r.id} className="align-top hover:bg-gray-50">
                    <td className="td">
                      <div className="font-mono font-semibold text-gray-800">{r.siteCode}</div>
                      {r.siteName && <div className="text-xs text-gray-500">{r.siteName}</div>}
                    </td>
                    <td className="td max-w-xs whitespace-normal text-gray-700">
                      {r.reason}
                      {r.status === "REJECTED" && r.rejectedReason && (
                        <div className="mt-1 text-xs text-red-600">سبب الرفض: {r.rejectedReason}</div>
                      )}
                    </td>
                    <td className="td"><span className={`chip ${st.cls}`}>{st.ar}</span></td>
                    <td className="td text-xs text-gray-500">{fmtDate(r.deletedAt ?? r.createdAt)}</td>
                    <td className="td">
                      {r.status === "PENDING" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={approveDeletionPhase}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="btn-primary text-xs">اعتماد مسؤول المرحلة</button>
                          </form>
                          <RejectDeletionForm id={r.id} stage="PHASE" />
                        </div>
                      )}
                      {r.status === "PHASE_APPROVED" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={approveDeletionPM}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="rounded-md bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700">
                              اعتماد مدير المشروع والحذف
                            </button>
                          </form>
                          <RejectDeletionForm id={r.id} stage="PM" />
                        </div>
                      )}
                      {(r.status === "COMPLETED" || r.status === "REJECTED") && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
