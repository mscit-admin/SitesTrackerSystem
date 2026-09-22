import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { NewTicketForm } from "@/components/NewTicketForm";
import { PaginationBar } from "@/components/PaginationBar";
import { RowActions } from "@/components/RowActions";
import { getSitesPageSize, openDeletionIdSet, PAGE_SIZE_OPTIONS } from "@/lib/queries";
import { resolveTicket, completePreventive } from "./actions";
import { fmtDate } from "@/lib/format";
import { Building2, CalendarClock, Wrench, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const PRIORITY_AR: Record<string, string> = {
  CRITICAL: "حرجة", HIGH: "عالية", MEDIUM: "متوسطة", LOW: "منخفضة",
};

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const def = await getSitesPageSize();
  const resolveSize = (key: string) => {
    const n = typeof sp[key] === "string" ? parseInt(sp[key] as string, 10) : NaN;
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : def;
  };
  const pSize = resolveSize("psize");
  const tSize = resolveSize("tsize");

  const [inOperation, pmOverdue, pmTotal, openTickets, ticketTotal, opsSites] = await Promise.all([
    prisma.site.count({ where: { isHandedOver: true } }),
    prisma.preventiveMaintenance.count({ where: { status: "OVERDUE" } }),
    prisma.preventiveMaintenance.count(),
    prisma.maintenanceTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.maintenanceTicket.count(),
    prisma.site.findMany({
      where: { isHandedOver: true },
      orderBy: { siteId: "asc" },
      select: { id: true, siteId: true, name: true },
    }),
  ]);

  const pPages = Math.max(1, Math.ceil(pmTotal / pSize));
  const pPage = Math.min(pPages, Math.max(1, typeof sp.ppage === "string" ? parseInt(sp.ppage, 10) || 1 : 1));
  const tPages = Math.max(1, Math.ceil(ticketTotal / tSize));
  const tPage = Math.min(tPages, Math.max(1, typeof sp.tpage === "string" ? parseInt(sp.tpage, 10) || 1 : 1));

  const [pmDueSoon, tickets, pmDelSet, tkDelSet] = await Promise.all([
    prisma.preventiveMaintenance.findMany({
      orderBy: { nextDueAt: "asc" },
      skip: (pPage - 1) * pSize,
      take: pSize,
      include: { site: { select: { id: true, siteId: true, name: true } } },
    }),
    prisma.maintenanceTicket.findMany({
      orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
      skip: (tPage - 1) * tSize,
      take: tSize,
      include: { site: { select: { id: true, siteId: true, name: true } } },
    }),
    openDeletionIdSet("PREVENTIVE"),
    openDeletionIdSet("MAINTENANCE_TICKET"),
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
        <StatCard label="مهام صيانة مجدولة" value={pmTotal} tone="sky" icon={CalendarClock} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Preventive maintenance */}
        <div>
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
                      <div className="flex items-center gap-2">
                        <form action={completePreventive}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="text-xs text-emerald-600 hover:underline">إنجاز</button>
                        </form>
                        <RowActions
                          entityType="PREVENTIVE"
                          entityId={String(t.id)}
                          label={t.taskType}
                          sublabel={t.site.siteId}
                          viewHref={`/sites/${t.site.id}`}
                          pending={pmDelSet.has(String(t.id))}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <PaginationBar page={pPage} pageSize={pSize} total={pmTotal} totalPages={pPages} pageKey="ppage" sizeKey="psize" />
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
                    <div className="flex items-center gap-2">
                      {(tk.status === "OPEN" || tk.status === "IN_PROGRESS") && (
                        <form action={resolveTicket}>
                          <input type="hidden" name="id" value={tk.id} />
                          <button className="text-xs text-emerald-600 hover:underline">حل البلاغ</button>
                        </form>
                      )}
                      <RowActions
                        entityType="MAINTENANCE_TICKET"
                        entityId={String(tk.id)}
                        label={tk.title}
                        sublabel={tk.site.siteId}
                        viewHref={`/sites/${tk.site.id}`}
                        pending={tkDelSet.has(String(tk.id))}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationBar page={tPage} pageSize={tSize} total={ticketTotal} totalPages={tPages} pageKey="tpage" sizeKey="tsize" />
    </div>
  );
}
