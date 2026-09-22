import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSites, getFilterOptions, getSitesPageSize, openDeletionIdSet, SiteFilters, PAGE_SIZE_OPTIONS } from "@/lib/queries";
import { PageHeader, Badge, ProgressBar } from "@/components/ui";
import { SitesFilterBar } from "@/components/SitesFilterBar";
import { PaginationBar } from "@/components/PaginationBar";
import { PHASE_BY_CODE, OVERALL_LABELS } from "@/lib/lifecycle";
import { fmtDate } from "@/lib/format";
import { Plus, Download, Trash2 } from "lucide-react";
import { ImportExcelButton } from "@/components/ImportExcelButton";
import { RowActions } from "@/components/RowActions";

export const dynamic = "force-dynamic";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters: SiteFilters = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    region: typeof sp.region === "string" ? sp.region : undefined,
    status: typeof sp.status === "string" ? sp.status : undefined,
    phase: typeof sp.phase === "string" ? sp.phase : undefined,
    batch: typeof sp.batch === "string" ? sp.batch : undefined,
  };

  const sizeParam = typeof sp.size === "string" ? parseInt(sp.size, 10) : NaN;
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(sizeParam)
    ? sizeParam
    : await getSitesPageSize();
  const page = Math.max(1, typeof sp.page === "string" ? parseInt(sp.page, 10) || 1 : 1);

  const [result, options, pendingDeletions, delSet] = await Promise.all([
    getSites(filters, page, pageSize),
    getFilterOptions(),
    prisma.deletionRequest.count({ where: { status: { in: ["PENDING", "PHASE_APPROVED"] } } }),
    openDeletionIdSet("SITE"),
  ]);
  const sites = result.rows;

  return (
    <div>
      <PageHeader title="المواقع" subtitle={`${result.total} موقعاً`}>
        <div className="flex items-center gap-2">
          <a
            href="/GSDN_Master.xlsb"
            download
            className="btn-ghost flex items-center gap-1.5"
            title="تنزيل ملف الإكسل الأصلي (GSDN Master)"
          >
            <Download size={16} /> تحميل ملف الإكسل
          </a>
          <ImportExcelButton />
          <Link href="/deletions" className="btn-ghost flex items-center gap-1.5" title="طلبات الحذف">
            <Trash2 size={16} /> طلبات الحذف
            {pendingDeletions > 0 && (
              <span className="chip bg-red-100 text-red-700 border-red-200">{pendingDeletions}</span>
            )}
          </Link>
          <Link href="/sites/new" className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> موقع جديد
          </Link>
        </div>
      </PageHeader>
      <SitesFilterBar regions={options.regions} batches={options.batches} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">المعرّف</th>
                <th className="th">اسم الموقع</th>
                <th className="th">المنطقة</th>
                <th className="th">النوع</th>
                <th className="th">الدُفعة</th>
                <th className="th">المرحلة الحالية</th>
                <th className="th">الحالة</th>
                <th className="th w-48">الإنجاز</th>
                <th className="th">على الهواء</th>
                <th className="th">مشاكل</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/sites/${s.id}`} className="font-mono font-semibold text-brand-light hover:underline">
                      {s.siteId}
                    </Link>
                  </td>
                  <td className="td max-w-52 truncate" title={s.name ?? ""}>{s.name ?? "—"}</td>
                  <td className="td">{s.region ?? "—"}</td>
                  <td className="td">{s.siteType ?? "—"}</td>
                  <td className="td text-slate-500">{s.deliveryBatch ?? "—"}</td>
                  <td className="td">{PHASE_BY_CODE[s.currentPhase]?.ar ?? s.currentPhase}</td>
                  <td className="td">
                    <Badge status={s.overallStatus} label={OVERALL_LABELS[s.overallStatus as keyof typeof OVERALL_LABELS]?.ar ?? s.overallStatus} />
                  </td>
                  <td className="td"><ProgressBar pct={s.progressPct} /></td>
                  <td className="td text-xs text-slate-500">{fmtDate(s.onairDate)}</td>
                  <td className="td text-center">
                    {delSet.has(s.id) ? (
                      <span className="chip bg-red-50 text-red-700 border-red-100">قيد الحذف</span>
                    ) : s._count.issues > 0 ? (
                      <span className="chip bg-red-100 text-red-700 border-red-200">{s._count.issues}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="td">
                    <RowActions
                      entityType="SITE"
                      entityId={s.id}
                      label={s.siteId}
                      sublabel={s.name ?? undefined}
                      viewHref={`/sites/${s.id}`}
                      editHref={`/sites/${s.id}/edit`}
                      pending={delSet.has(s.id)}
                    />
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td colSpan={11} className="td py-10 text-center text-slate-400">
                    لا توجد مواقع مطابقة للفلاتر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationBar page={result.page} pageSize={result.pageSize} total={result.total} totalPages={result.totalPages} />
    </div>
  );
}
