"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, X, ArrowLeft, Plus, Trash2, Boxes } from "lucide-react";
import {
  primaryAction,
  canReject,
  stageBadge,
  stageLabel,
  ownerLabel,
  ownerTypeOf,
  ActionKind,
} from "@/lib/acquisition";
import {
  approveCandidate,
  requestSurvey,
  grantSurvey,
  recordSurvey,
  approveTech,
  approveFinal,
  rejectCandidate,
  convertToSite,
  addCandidateEquipment,
  removeCandidateEquipment,
} from "@/app/acquisition/actions";

type EquipLine = { id: string; equipmentType: string; manufacturer: string | null; quantity: number };

type Cand = {
  id: string;
  name: string | null;
  equipment?: EquipLine[];
  latitude: number | null;
  longitude: number | null;
  proximityKm: number | null;
  fiberAvailable: string | null;
  easeOfProcedures: string | null;
  towerOwner: string | null;
  towerOwnerDetail: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  address: string | null;
  surveyDate: string | null;
  towerInfo: string | null;
  requiredHeights: string | null;
  proposedEquipment: string | null;
  installationReq: string | null;
  stage: string;
  rejectionReason: string | null;
  rejectionGate: string | null;
  linkedSiteId: string | null;
};

const SIMPLE: Partial<Record<ActionKind, (fd: FormData) => Promise<any>>> = {
  approveCandidate,
  requestSurvey,
  grantSurvey,
  approveTech,
};

export function CandidateCard({
  c,
  equipmentTypes = [],
  manufacturers = [],
}: {
  c: Cand;
  equipmentTypes?: string[];
  manufacturers?: string[];
}) {
  const [open, setOpen] = useState<null | "survey" | "final" | "convert" | "reject">(null);
  const [error, setError] = useState<string | null>(null);
  const action = primaryAction(c.stage);
  const isSector = ownerTypeOf(c.towerOwner) === "SECTOR";
  // Equipment can be determined once survey permission is granted, before final approval.
  const showEquip = !["SUBMITTED", "APPROVED_CANDIDATE", "SURVEY_REQUESTED", "REJECTED"].includes(c.stage);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-gray-900">{c.name ?? "مرشّح بلا اسم"}</div>
          <div className="mt-0.5 text-xs text-gray-500">
            {ownerLabel(c.towerOwner, c.towerOwnerDetail)}
            {isSector && <span className="mr-1 text-emerald-600"> · شركة قطاع (أولوية)</span>}
          </div>
        </div>
        <span className={`chip ${stageBadge(c.stage)}`}>{stageLabel(c.stage)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 md:grid-cols-4">
        <Info label="القرب" value={c.proximityKm != null ? `${c.proximityKm} كم` : "—"} />
        <Info label="الفايبر" value={fiberAr(c.fiberAvailable)} />
        <Info label="الإجراءات" value={easeAr(c.easeOfProcedures)} />
        <Info label="الإحداثيات" value={c.latitude && c.longitude ? `${c.latitude}, ${c.longitude}` : "—"} />
        {(c.contactPerson || c.contactPhone) && (
          <Info label="التواصل" value={[c.contactPerson, c.contactPhone].filter(Boolean).join(" · ")} />
        )}
        {c.address && <Info label="العنوان" value={c.address} />}
      </div>

      {c.surveyDate && (
        <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
          <span className="font-medium text-gray-700">نتائج المسح ({c.surveyDate}): </span>
          {[c.towerInfo, c.requiredHeights && `ارتفاعات: ${c.requiredHeights}`, c.proposedEquipment && `معدات: ${c.proposedEquipment}`]
            .filter(Boolean)
            .join(" · ") || "مسجّلة"}
        </div>
      )}

      {c.stage === "REJECTED" && (
        <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-2 text-xs text-red-700">
          مرفوض عند: {c.rejectionGate ?? "—"} — {c.rejectionReason ?? "بدون سبب"}
        </div>
      )}

      {c.stage === "ACQUIRED" && c.linkedSiteId && (
        <Link href={`/sites/${c.linkedSiteId}`} className="mt-3 inline-flex items-center gap-1 text-sm text-brand-light hover:underline">
          <ArrowLeft size={14} /> عرض الموقع المُنشأ
        </Link>
      )}

      {showEquip && (
        <EquipmentSection
          candidateId={c.id}
          lines={c.equipment ?? []}
          equipmentTypes={equipmentTypes}
          manufacturers={manufacturers}
          editable={c.stage !== "ACQUIRED"}
        />
      )}

      {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</div>}

      {/* Action row */}
      {action && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          {action.needsForm ? (
            <button
              onClick={() => setOpen(open === formKey(action.kind) ? null : formKey(action.kind))}
              className="btn-primary flex items-center gap-1.5"
            >
              {action.gate && <GateTag n={action.gate} />} {action.label}
            </button>
          ) : (
            <form action={SIMPLE[action.kind]}>
              <input type="hidden" name="candidateId" value={c.id} />
              <button type="submit" className="btn-primary flex items-center gap-1.5">
                {action.gate && <GateTag n={action.gate} />} {action.label}
              </button>
            </form>
          )}
          {canReject(c.stage) && (
            <button onClick={() => setOpen(open === "reject" ? null : "reject")} className="btn-ghost flex items-center gap-1 text-red-600">
              <X size={14} /> رفض
            </button>
          )}
        </div>
      )}

      {/* Inline forms */}
      {open === "survey" && (
        <InlineForm onClose={() => setOpen(null)} action={recordSurvey} candidateId={c.id} title="تسجيل نتائج المسح الميداني">
          <FieldRow>
            <L label="تاريخ المسح"><input name="surveyDate" type="date" className="field w-full" /></L>
            <L label="معلومات البرج"><input name="towerInfo" className="field w-full" /></L>
          </FieldRow>
          <FieldRow>
            <L label="الارتفاعات المطلوبة"><input name="requiredHeights" className="field w-full" /></L>
            <L label="المعدات المقترحة"><input name="proposedEquipment" className="field w-full" /></L>
          </FieldRow>
          <L label="متطلبات التركيب"><input name="installationReq" className="field w-full" /></L>
        </InlineForm>
      )}

      {open === "final" && (
        <InlineForm onClose={() => setOpen(null)} action={approveFinal} candidateId={c.id} title="الاعتماد النهائي (مالك البرج)">
          <FieldRow>
            <L label="العنوان المعتمد"><input name="address" defaultValue={c.address ?? ""} className="field w-full" /></L>
            <L label="الارتفاعات المعتمدة"><input name="approvedHeights" className="field w-full" /></L>
          </FieldRow>
          <FieldRow>
            <L label="المعدات المعتمدة"><input name="approvedEquipment" className="field w-full" /></L>
            <L label="الوثائق"><input name="finalDocs" className="field w-full" /></L>
          </FieldRow>
        </InlineForm>
      )}

      {open === "convert" && (
        <ConvertForm candidateId={c.id} onError={setError} onClose={() => setOpen(null)} />
      )}

      {open === "reject" && (
        <InlineForm onClose={() => setOpen(null)} action={rejectCandidate} candidateId={c.id} title="رفض المرشّح" danger>
          <input type="hidden" name="gate" value={stageLabel(c.stage)} />
          <L label="سبب الرفض">
            <textarea name="reason" rows={2} required className="field w-full" />
          </L>
          <p className="text-xs text-gray-400">سيعود المسار للبحث عن مرشّح آخر لهذه النقطة.</p>
        </InlineForm>
      )}
    </div>
  );
}

function EquipmentSection({
  candidateId,
  lines,
  equipmentTypes,
  manufacturers,
  editable,
}: {
  candidateId: string;
  lines: EquipLine[];
  equipmentTypes: string[];
  manufacturers: string[];
  editable: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <Boxes size={15} className="text-brand" /> المعدات المحددة
      </div>

      {lines.length > 0 ? (
        <table className="mb-2 w-full text-xs">
          <thead>
            <tr className="text-gray-400">
              <th className="py-1 text-right font-medium">نوع المعدة</th>
              <th className="py-1 text-right font-medium">الشركة المصنّعة</th>
              <th className="py-1 text-center font-medium">الكمية</th>
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-gray-100 text-gray-700">
                <td className="py-1">{l.equipmentType}</td>
                <td className="py-1">{l.manufacturer ?? "—"}</td>
                <td className="py-1 text-center tabular-nums">{l.quantity}</td>
                {editable && (
                  <td className="py-1 text-left">
                    <form action={removeCandidateEquipment}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="text-gray-400 hover:text-red-600" title="حذف"><Trash2 size={13} /></button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mb-2 text-xs text-gray-400">لا توجد معدات محددة بعد.</p>
      )}

      {editable && (
        equipmentTypes.length === 0 ? (
          <p className="text-xs text-amber-600">
            عرّف أنواع المعدات والشركات المصنّعة أولاً من{" "}
            <Link href="/settings" className="underline">شاشة الإعدادات</Link>.
          </p>
        ) : (
          <form
            ref={formRef}
            action={async (fd) => {
              await addCandidateEquipment(fd);
              formRef.current?.reset();
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="candidateId" value={candidateId} />
            <div className="min-w-36 flex-1">
              <label className="mb-1 block text-[11px] text-gray-500">نوع المعدة</label>
              <select name="equipmentType" required className="field w-full py-1.5 text-xs" defaultValue="">
                <option value="" disabled>اختر…</option>
                {equipmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="min-w-36 flex-1">
              <label className="mb-1 block text-[11px] text-gray-500">الشركة المصنّعة</label>
              <select name="manufacturer" className="field w-full py-1.5 text-xs" defaultValue="">
                <option value="">—</option>
                {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="w-20">
              <label className="mb-1 block text-[11px] text-gray-500">الكمية</label>
              <input name="quantity" type="number" min="1" defaultValue="1" className="field w-full py-1.5 text-xs" />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-1 py-1.5 text-xs">
              <Plus size={14} /> إضافة
            </button>
          </form>
        )
      )}
    </div>
  );
}

function formKey(kind: ActionKind): "survey" | "final" | "convert" {
  if (kind === "recordSurvey") return "survey";
  if (kind === "approveFinal") return "final";
  return "convert";
}

function ConvertForm({ candidateId, onError, onClose }: { candidateId: string; onError: (e: string | null) => void; onClose: () => void }) {
  return (
    <form
      action={async (fd) => {
        onError(null);
        const r = await convertToSite(fd);
        if (r && !r.ok) onError(r.error ?? "تعذّر التحويل");
      }}
      className="mt-3 rounded-md border border-emerald-100 bg-emerald-50/50 p-3"
    >
      <input type="hidden" name="candidateId" value={candidateId} />
      <div className="mb-2 text-sm font-semibold text-gray-800">تحويل إلى موقع رسمي</div>
      <L label="معرّف الموقع الرسمي الجديد (خاص بترقيم المالك) *">
        <input name="siteId" required placeholder="مثال: TR300" className="field w-full" />
      </L>
      <div className="mt-3 flex gap-2">
        <button type="submit" className="btn-primary flex items-center gap-1.5"><Check size={15} /> تأكيد التحويل</button>
        <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
      </div>
    </form>
  );
}

function InlineForm({
  action,
  candidateId,
  title,
  children,
  onClose,
  danger,
}: {
  action: (fd: FormData) => Promise<any>;
  candidateId: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  danger?: boolean;
}) {
  return (
    <form
      action={async (fd) => {
        await action(fd);
        onClose();
      }}
      className={`mt-3 space-y-3 rounded-md border p-3 ${danger ? "border-red-100 bg-red-50/50" : "border-gray-200 bg-gray-50/60"}`}
    >
      <input type="hidden" name="candidateId" value={candidateId} />
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      {children}
      <div className="flex gap-2">
        <button type="submit" className={danger ? "rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700" : "btn-primary"}>
          حفظ
        </button>
        <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
      </div>
    </form>
  );
}

const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
);
const L = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
    {children}
  </div>
);
const Info = ({ label, value }: { label: string; value: string }) => (
  <div><span className="text-gray-400">{label}:</span> <span className="text-gray-700">{value}</span></div>
);
const GateTag = ({ n }: { n: number }) => (
  <span className="rounded bg-white/25 px-1 text-[10px]">بوّابة {n}</span>
);

const fiberAr = (v: string | null) => (v === "Yes" ? "متوفّر" : v === "Partial" ? "جزئي" : v === "No" ? "غير متوفّر" : "—");
const easeAr = (v: string | null) => (v === "High" ? "سهلة" : v === "Medium" ? "متوسطة" : v === "Low" ? "صعبة" : "—");
