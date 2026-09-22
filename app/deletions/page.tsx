import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { RejectDeletionForm } from "@/components/RejectDeletionForm";
import { approveDeletionPhase, approveDeletionPM } from "@/app/actions/deletion";
import { ENTITY_AR, DEL_STATUS } from "@/lib/deletion";
import { fmtDate } from "@/lib/format";
import { ClipboardCheck, Clock, Trash2, Ban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DeletionsPage() {
  const [requests, pending, phase, done] = await Promise.all([
    prisma.deletionRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.deletionRequest.count({ where: { status: "PENDING" } }),
    prisma.deletionRequest.count({ where: { status: "PHASE_APPROVED" } }),
    prisma.deletionRequest.count({ where: { status: "COMPLETED" } }),
  ]);

  return (
    <div>
      <PageHeader title="طلبات الحذف" subtitle="حذف أي عنصر يتطلب موافقة مسؤول المرحلة ثم مدير المشروع" />

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
                <th className="th">النوع</th>
                <th className="th">العنصر</th>
                <th className="th">سبب الحذف</th>
                <th className="th">الحالة</th>
                <th className="th">التاريخ</th>
                <th className="th">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 && (
                <tr><td colSpan={6} className="td py-10 text-center text-gray-400">لا توجد طلبات حذف.</td></tr>
              )}
              {requests.map((r) => {
                const st = DEL_STATUS[r.status] ?? { ar: r.status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                return (
                  <tr key={r.id} className="align-top hover:bg-gray-50">
                    <td className="td text-xs text-gray-500">{ENTITY_AR[r.entityType] ?? r.entityType}</td>
                    <td className="td">
                      <div className="font-mono font-semibold text-gray-800">{r.label}</div>
                      {r.sublabel && <div className="text-xs text-gray-500">{r.sublabel}</div>}
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
