import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { PaginationBar } from "@/components/PaginationBar";
import { AuditRow, type AuditRowData } from "@/components/audit/AuditRow";
import { getCurrentUser, can } from "@/lib/auth";
import { CATEGORY_AR, ACTION_AR } from "@/lib/audit";
import { parseAuditFilter, auditWhere } from "@/lib/auditQuery";
import { PAGE_SIZE_OPTIONS } from "@/lib/queries";

export const dynamic = "force-dynamic";

function fmtTime(d: Date): string {
  // Server runs in UTC; show Libya local time (UTC+2, no DST).
  const t = new Date(d.getTime() + 2 * 3600_000);
  return t.toISOString().slice(0, 16).replace("T", " ");
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!can(me, "audit.view")) redirect("/");
  const canExport = can(me, "audit.export");

  const sp = await searchParams;
  const filter = parseAuditFilter(sp);
  const where = auditWhere(filter);

  const sizeRaw = parseInt(String(sp.size ?? ""), 10);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(sizeRaw) ? sizeRaw : 25;
  const pageRaw = parseInt(String(sp.page ?? "1"), 10);

  const total = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, isNaN(pageRaw) ? 1 : pageRaw), totalPages);

  const [logs, actors, entityRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.findMany({ select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
    prisma.auditLog.findMany({ where: { entity: { not: null } }, select: { entity: true }, distinct: ["entity"], orderBy: { entity: "asc" } }),
  ]);

  const rows: AuditRowData[] = logs.map((l) => ({
    id: l.id,
    time: fmtTime(l.createdAt),
    category: l.category,
    categoryAr: CATEGORY_AR[l.category] ?? l.category,
    action: l.action,
    actionAr: ACTION_AR[l.action] ?? l.action,
    success: l.success,
    actorName: l.actorName,
    actorEmail: l.actorEmail,
    actorRole: l.actorRole,
    entity: l.entity,
    entityLabel: l.entityLabel,
    summary: l.summary,
    before: l.before,
    after: l.after,
    ip: l.ip,
    userAgent: l.userAgent,
  }));

  const entities = entityRows.map((e) => e.entity!).filter(Boolean);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v) qs.set(k, String(v));
  const exportHref = `/api/audit/export?${qs.toString()}`;

  const Sel = ({ name, value, children }: { name: string; value?: string; children: React.ReactNode }) => (
    <select name={name} defaultValue={value ?? ""} className="field py-1.5 text-sm">
      {children}
    </select>
  );

  return (
    <div>
      <PageHeader title="سجل التدقيق" subtitle="سجل غير قابل للتعديل يوثّق كل تغيير وكل حدث أمني في النظام" />

      <form method="get" action="/audit" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">الفئة</label>
          <Sel name="category" value={filter.category}>
            <option value="">الكل</option>
            {Object.entries(CATEGORY_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">الإجراء</label>
          <Sel name="action" value={filter.action}>
            <option value="">الكل</option>
            {Object.entries(ACTION_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">المستخدم</label>
          <Sel name="actorId" value={filter.actorId}>
            <option value="">الكل</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
          </Sel>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">العنصر</label>
          <Sel name="entity" value={filter.entity}>
            <option value="">الكل</option>
            {entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </Sel>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">من تاريخ</label>
          <input type="date" name="from" defaultValue={filter.from ?? ""} className="field py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">إلى تاريخ</label>
          <input type="date" name="to" defaultValue={filter.to ?? ""} className="field py-1.5 text-sm" />
        </div>
        <div className="grow">
          <label className="mb-1 block text-[11px] font-medium text-gray-500">بحث</label>
          <input type="search" name="q" defaultValue={filter.q ?? ""} placeholder="وصف / اسم / بريد / IP" className="field w-full py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary">تصفية</button>
          <Link href="/audit" className="btn-ghost flex items-center gap-1"><RotateCcw size={14} /> مسح</Link>
        </div>
      </form>

      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-gray-500">{total} سجل</div>
        {canExport && (
          <a href={exportHref} className="btn-ghost flex items-center gap-1.5 text-sm">
            <Download size={15} /> تصدير CSV
          </a>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-right">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">الوقت</th>
              <th className="px-3 py-2 font-medium">الفئة</th>
              <th className="px-3 py-2 font-medium">الإجراء</th>
              <th className="px-3 py-2 font-medium">المستخدم</th>
              <th className="px-3 py-2 font-medium">التفاصيل</th>
              <th className="px-3 py-2 font-medium">IP</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">لا توجد سجلات مطابقة.</td></tr>
            ) : (
              rows.map((r) => <AuditRow key={r.id} r={r} />)
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar page={page} pageSize={pageSize} total={total} totalPages={totalPages} />
    </div>
  );
}
