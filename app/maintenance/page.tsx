import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { NewTicketForm } from "@/components/NewTicketForm";
import { resolveTicket, completePreventive } from "./actions";
import { fmtDate } from "@/lib/format";
import { Building2, CalendarClock, Wrench, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const PRIORITY_AR: Record<string, string> = {
  CRITICAL: "حرجة", HIGH: "عالية", MEDIUM: "متوسطة", LOW: "منخفضة",
};

export default async function MaintenancePage() {
  const [inOperation, pmOverdue, pmDueSoon, openTickets, tickets, opsSites] = await Promise.all([
    prisma.site.count({ where: { isHandedOver: true } }),
    prisma.preventiveMaintenance.count({ where: { status: "OVERDUE" } }),
    prisma.preventiveMaintenance.findMany({
      orderBy: { nextDueAt: "asc" },
      take: 20,
      include: { site: { select: { id: true, siteId: true, name: true } } },
    }),
    prisma.maintenanceTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.maintenanceTicket.findMany({
      orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
      take: 30,
      include: { site: { select: { id: true, siteId: true, name: true } } },
    }),
    prisma.site.findMany({
      where: { isHandedOver: true },
      orderBy: { siteId: "asc" },
      select: { id: true, siteId: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="التشغيل والصيانة (O&M)"
        subtitle="متابعة المواقع بعد التسليم النهائي: الصيانة الدورية والبلاغات التصحيحية"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="مواقع قيد التشغيل" value={inOperation} tone="emerald" icon={Building2} />
        <StatCard label="صيانة دورية متأخرة" value={pmOverdue} tone="red" icon={AlertTriangle} />
        <StatCard label="بلاغات مفتوحة" value={openTickets} tone="amber" icon={Wrench} />
        <StatCard label="مهام صيانة مجدولة" value={pmDueSoon.length} tone="sky" icon={CalendarClock} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Preventive maintenance */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-base font-bold text-slate-800">الصيانة الدورية القادمة</h2>
          </div>
          <div className="max-h-[520px] overflow-y-auto scroll-slim">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="th">الموقع</th>
                  <th className="th">المهمة</th>
                  <th className="th">الاستحقاق</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pmDueSoon.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/sites/${t.site.id}`} className="font-mono text-brand-light hover:underline">
                        {t.site.siteId}
                      </Link>
                    </td>
                    <td className="td max-w-40 truncate" title={t.taskType}>{t.taskType}</td>
                    <td className="td">
                      <span className="flex items-center gap-2 text-xs">
                        {fmtDate(t.nextDueAt)}
                        {t.status === "OVERDUE" && <Badge status="BLOCKED" label="متأخرة" />}
                      </span>
                    </td>
                    <td className="td">
                      <form action={completePreventive}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="text-xs text-emerald-600 hover:underline">إنجاز</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New ticket + tickets list */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 text-base font-bold text-slate-800">تسجيل بلاغ صيانة جديد</h2>
            <NewTicketForm sites={opsSites} />
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-base font-bold text-slate-800">بلاغات الصيانة التصحيحية</h2>
        </div>
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">الموقع</th>
                <th className="th">البلاغ</th>
                <th className="th">التصنيف</th>
                <th className="th">الأولوية</th>
                <th className="th">الحالة</th>
                <th className="th">تاريخ البلاغ</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.length === 0 && (
                <tr><td colSpan={7} className="td py-8 text-center text-slate-400">لا توجد بلاغات بعد.</td></tr>
              )}
              {tickets.map((tk) => (
                <tr key={tk.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/sites/${tk.site.id}`} className="font-mono text-brand-light hover:underline">
                      {tk.site.siteId}
                    </Link>
                  </td>
                  <td className="td max-w-xs whitespace-normal font-medium">{tk.title}</td>
                  <td className="td text-xs text-slate-500">{tk.category ?? "—"}</td>
                  <td className="td text-xs">{PRIORITY_AR[tk.priority] ?? tk.priority}</td>
                  <td className="td">
                    <Badge status={tk.status === "OPEN" || tk.status === "IN_PROGRESS" ? "OPEN" : "CLOSED"} label={tk.status} />
                  </td>
                  <td className="td text-xs text-slate-500">{fmtDate(tk.reportedAt)}</td>
                  <td className="td">
                    {(tk.status === "OPEN" || tk.status === "IN_PROGRESS") && (
                      <form action={resolveTicket}>
                        <input type="hidden" name="id" value={tk.id} />
                        <button className="text-xs text-emerald-600 hover:underline">حل البلاغ</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
