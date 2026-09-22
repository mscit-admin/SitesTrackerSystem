// Acquisition workflow domain logic: tower owners, candidate stages, gates.

export interface TowerOwnerOption {
  value: string;
  label: string;
  type: "SECTOR" | "CITIZEN" | "OTHER";
}

// Sector (telecom) companies are prioritised over citizens/others in selection.
export const TOWER_OWNERS: TowerOwnerOption[] = [
  { value: "Almadar", label: "شركة المدار الجديد", type: "SECTOR" },
  { value: "Albounya", label: "شركة البنية", type: "SECTOR" },
  { value: "Libyana", label: "شركة ليبيانا", type: "SECTOR" },
  { value: "LTT", label: "شركة ليبيا للاتصالات والتقنية (LTT)", type: "SECTOR" },
  { value: "Citizen", label: "مواطن (فرد)", type: "CITIZEN" },
  { value: "Other", label: "أخرى (تُذكر)", type: "OTHER" },
];

export const TOWER_OWNER_BY_VALUE: Record<string, TowerOwnerOption> = Object.fromEntries(
  TOWER_OWNERS.map((o) => [o.value, o])
);

export function ownerTypeOf(towerOwner: string | null | undefined): string {
  return TOWER_OWNER_BY_VALUE[towerOwner ?? ""]?.type ?? "OTHER";
}

export function ownerLabel(value: string | null | undefined, detail?: string | null): string {
  if (!value) return "—";
  const base = TOWER_OWNER_BY_VALUE[value]?.label ?? value;
  return value === "Other" && detail ? `${base}: ${detail}` : base;
}

// ---- Candidate workflow stages ----
export interface StageDef {
  code: string;
  ar: string;
  gate?: 1 | 2 | 3 | 4;
  gateOwner?: string; // who acts at this stage
  badge: string; // static tailwind classes
}

export const STAGES: StageDef[] = [
  { code: "SUBMITTED", ar: "مُقدَّم للاعتماد", gate: 1, gateOwner: "المنفّذ (AT Globe)", badge: "bg-amber-50 text-amber-700 border-amber-100" },
  { code: "APPROVED_CANDIDATE", ar: "مرشّح معتمد", gateOwner: "—", badge: "bg-sky-50 text-sky-700 border-sky-100" },
  { code: "SURVEY_REQUESTED", ar: "طلب إذن مسح", gate: 2, gateOwner: "مالك البرج", badge: "bg-amber-50 text-amber-700 border-amber-100" },
  { code: "SURVEY_APPROVED", ar: "إذن المسح ممنوح", gateOwner: "المنفّذ", badge: "bg-sky-50 text-sky-700 border-sky-100" },
  { code: "SURVEYED", ar: "تم المسح الميداني", gate: 3, gateOwner: "المالك (AAT)", badge: "bg-sky-50 text-sky-700 border-sky-100" },
  { code: "TECH_APPROVED", ar: "اعتماد فني", gate: 4, gateOwner: "مالك البرج", badge: "bg-sky-50 text-sky-700 border-sky-100" },
  { code: "FINAL_APPROVED", ar: "اعتماد نهائي", gateOwner: "المالك (AAT)", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { code: "ACQUIRED", ar: "مُستحوَذ ✓", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { code: "REJECTED", ar: "مرفوض", badge: "bg-red-50 text-red-700 border-red-100" },
];

export const STAGE_BY_CODE: Record<string, StageDef> = Object.fromEntries(
  STAGES.map((s) => [s.code, s])
);

export function stageBadge(code: string): string {
  return STAGE_BY_CODE[code]?.badge ?? "bg-gray-100 text-gray-600 border-gray-200";
}

export function stageLabel(code: string): string {
  return STAGE_BY_CODE[code]?.ar ?? code;
}

// Primary "advance" action available at each stage (used by the UI).
export type ActionKind =
  | "approveCandidate"
  | "requestSurvey"
  | "grantSurvey"
  | "recordSurvey"
  | "approveTech"
  | "approveFinal"
  | "convert";

export interface StageAction {
  kind: ActionKind;
  label: string;
  gate?: 1 | 2 | 3 | 4;
  needsForm?: boolean; // opens an inline form
}

export function primaryAction(stage: string): StageAction | null {
  switch (stage) {
    case "SUBMITTED":
      return { kind: "approveCandidate", label: "اعتماد المرشّح", gate: 1 };
    case "APPROVED_CANDIDATE":
      return { kind: "requestSurvey", label: "طلب إذن المسح", gate: 2 };
    case "SURVEY_REQUESTED":
      return { kind: "grantSurvey", label: "منح إذن المسح", gate: 2 };
    case "SURVEY_APPROVED":
      return { kind: "recordSurvey", label: "تسجيل نتائج المسح", gate: 3, needsForm: true };
    case "SURVEYED":
      return { kind: "approveTech", label: "الاعتماد الفني", gate: 3 };
    case "TECH_APPROVED":
      return { kind: "approveFinal", label: "الاعتماد النهائي", gate: 4, needsForm: true };
    case "FINAL_APPROVED":
      return { kind: "convert", label: "تحويل إلى موقع", needsForm: true };
    default:
      return null;
  }
}

// Stages from which the candidate can still be rejected.
export function canReject(stage: string): boolean {
  return !["ACQUIRED", "REJECTED"].includes(stage);
}
