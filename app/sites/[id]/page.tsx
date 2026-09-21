import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/queries";
import { Badge, ProgressBar } from "@/components/ui";
import { LifecycleTimeline } from "@/components/LifecycleTimeline";
import { OVERALL_LABELS } from "@/lib/lifecycle";
import { fmtDate, fmtNum, badge } from "@/lib/format";

export const dynamic = "force-dynamic";

const EQUIP_GROUPS: { title: string; fields: [string, string][] }[] = [
  {
    title: "الحل اللاسلكي (Wireless)",
    fields: [
      ["wlVendor", "المورّد"], ["wlSectorQty", "عدد القطاعات"], ["wlAntennaType", "نوع الهوائي"],
      ["wlRfHeight", "ارتفاع RF (م)"], ["wlAzimuth", "السمت"], ["wlMTilt", "الميل"],
    ],
  },
  {
    title: "الميكروويف (MW)",
    fields: [
      ["mwVendor", "المورّد"], ["mwAntennaQty", "عدد الهوائيات"], ["mwAntennaType", "النوع"],
      ["mwAntennaHeight", "الارتفاع (م)"], ["mwAzimuth", "السمت"], ["mwRssi", "RSSI"], ["mwUplinkSite", "موقع الوصلة"],
    ],
  },
  {
    title: "الشبكة (IP)",
    fields: [["ipVendor", "المورّد"], ["ipRouterQty", "عدد الراوترات"], ["ipRouterType", "النوع"]],
  },
  {
    title: "الطاقة (Power)",
    fields: [
      ["pwrRectifierStatus", "حالة المقوّم"], ["pwrVendor", "المورّد"], ["pwrRatedRectifier", "القدرة (kW)"],
      ["pwrMdbType", "نوع MDB"], ["pwrBatteryType", "نوع البطارية"], ["pwrBatteryModel", "الموديل"],
      ["pwrBatteryCapacity", "السعة (AH)"], ["pwrBatteryQty", "العدد"], ["pwrBackupTime", "زمن الاحتياطي"], ["pwrDg", "المولّد"],
    ],
  },
];

const BOQ_LABELS: [string, string][] = [
  ["towerM", "برج (م)"], ["mountingPoleM", "أعمدة تثبيت (م)"], ["concretePlain", "خرسانة عادية (م³)"],
  ["concreteReinf", "خرسانة مسلّحة (م³)"], ["acCable4x16", "كابل AC 4×16 (م)"], ["acCable4x10", "كابل AC 4×10 (م)"],
  ["dcCable25", "كابل DC 25 (م)"], ["dcCable35", "كابل DC 35 (م)"], ["ofPatchCord", "فايبر Patch (م)"],
  ["ofOutdoorShield", "فايبر خارجي (م)"], ["cableTrayIndoor", "مجرى كابلات داخلي (م)"], ["cableTrayOutdoor", "مجرى خارجي (م)"],
  ["gnd16", "تأريض 16 (م)"], ["gnd35", "تأريض 35 (م)"], ["gnd50", "تأريض 50 (م)"],
  ["busbar", "قضيب توزيع"], ["copperRod", "قضيب نحاسي"], ["manhole", "غرفة تفتيش"],
  ["acBox", "صندوق AC"], ["dcBox", "صندوق DC"], ["indoorRack", "رف داخلي"],
];

function parse(json: string | null): Record<string, any> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const teBoq = parse(site.teBoq);
  const cwBoq = parse(site.cwBoq);
  const boqRows = BOQ_LABELS.filter(([k]) => {
    const v = cwBoq[k];
    return v != null && v !== 0 && v !== "0";
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <Link href="/sites" className="text-sm text-slate-400 hover:text-slate-600">← رجوع للمواقع</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <span className="font-mono text-brand">{site.siteId}</span>
              <span>{site.name}</span>
            </h1>
            <div className="mt-1 text-sm text-slate-500">
              {site.region} · {site.subRegion} · {site.siteType}
            </div>
          </div>
          <div className="text-left">
            <Badge status={site.overallStatus} label={OVERALL_LABELS[site.overallStatus as keyof typeof OVERALL_LABELS]?.ar ?? site.overallStatus} />
            <div className="mt-2 w-48"><ProgressBar pct={site.progressPct} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: info */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 text-base font-bold text-slate-800">معلومات الموقع</h2>
            <InfoRow label="مالك البرج" value={site.towerOwner} />
            <InfoRow label="معرّف المالك" value={site.ownerSiteId} />
            <InfoRow label="نوع البرج" value={site.towerType} />
            <InfoRow label="ارتفاع البرج" value={site.towerHeight ? `${fmtNum(site.towerHeight)} م` : null} />
            <InfoRow label="قائم/جديد" value={site.existingOrNew} />
            <InfoRow label="RT / GF" value={site.rtOrGf} />
            <InfoRow label="السيناريو" value={site.scenario} />
            <InfoRow label="الدُفعة" value={site.deliveryBatch} />
            <InfoRow label="الطوبولوجيا" value={site.primaryMFN && site.primaryMFN !== "N/A" ? site.primaryMFN : site.uplinkSite} />
            {site.latitude && site.longitude && (
              <InfoRow
                label="الموقع الجغرافي"
                value={
                  <a
                    href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-light hover:underline"
                  >
                    {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)} ↗
                  </a>
                }
              />
            )}
          </div>

          {/* Issues */}
          <div className="card p-5">
            <h2 className="mb-3 text-base font-bold text-slate-800">
              المشاكل والملاحظات {site.issues.length > 0 && <span className="text-red-500">({site.issues.length})</span>}
            </h2>
            {site.issues.length === 0 ? (
              <p className="text-sm text-slate-400">لا توجد مشاكل مسجّلة.</p>
            ) : (
              <ul className="space-y-3">
                {site.issues.map((iss) => (
                  <li key={iss.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{iss.title}</span>
                      <Badge status={iss.status} label={iss.status === "OPEN" ? "مفتوحة" : "مغلقة"} />
                    </div>
                    {iss.owner && <div className="mt-1 text-xs text-slate-500">المسؤول: {iss.owner}</div>}
                    {iss.remark && <div className="mt-1 text-xs text-slate-500">{iss.remark}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Middle: lifecycle timeline */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-4 text-base font-bold text-slate-800">دورة حياة الموقع</h2>
          <LifecycleTimeline milestones={site.milestones} />
        </div>

        {/* Right: equipment + BOQ + maintenance */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 text-base font-bold text-slate-800">المعدات والحل الفني (TE BOQ)</h2>
            <div className="space-y-4">
              {EQUIP_GROUPS.map((g) => {
                const rows = g.fields.filter(([k]) => {
                  const v = teBoq[k];
                  return v != null && v !== "N/A" && v !== "";
                });
                if (rows.length === 0) return null;
                return (
                  <div key={g.title}>
                    <h3 className="mb-1 text-sm font-semibold text-brand">{g.title}</h3>
                    {rows.map(([k, label]) => (
                      <InfoRow key={k} label={label} value={String(teBoq[k])} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {boqRows.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 text-base font-bold text-slate-800">جدول الكميات المدنية (CW BOQ)</h2>
              {boqRows.map(([k, label]) => (
                <InfoRow key={k} label={label} value={fmtNum(Number(cwBoq[k]), 1)} />
              ))}
            </div>
          )}

          {(site.preventiveTasks.length > 0 || site.maintenanceTickets.length > 0) && (
            <div className="card p-5">
              <h2 className="mb-3 text-base font-bold text-slate-800">الصيانة الدورية</h2>
              {site.preventiveTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm">
                  <span className="text-slate-700">{t.taskType}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{fmtDate(t.nextDueAt)}</span>
                    <Badge status={t.status === "OVERDUE" ? "BLOCKED" : "IN_PROGRESS"} label={t.status === "OVERDUE" ? "متأخرة" : "مجدولة"} />
                  </span>
                </div>
              ))}
              {site.maintenanceTickets.length > 0 && (
                <div className="mt-3 space-y-2">
                  {site.maintenanceTickets.map((tk) => (
                    <div key={tk.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{tk.title}</span>
                        <Badge status={tk.status === "OPEN" ? "OPEN" : "CLOSED"} label={tk.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
