// Shared lifecycle domain logic: phase catalogue + status/progress derivation.
// Pure (no DB / no React) so it can be reused by the seed and the app.

export type MilestoneStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "DONE"
  | "NA"
  | "BLOCKED";

export type OverallStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ONAIR"
  | "HANDED_OVER"
  | "IN_OPERATION"
  | "BLOCKED";

export interface PhaseDef {
  code: string;
  order: number;
  ar: string;
  en: string;
  group: "DELIVERY" | "OPERATION";
}

// Full journey: design → preparation → testing → launch → handover → maintenance.
export const PHASES: PhaseDef[] = [
  { code: "DESIGN", order: 1, ar: "التصميم والمسح", en: "Design & Survey", group: "DELIVERY" },
  { code: "ACQUISITION", order: 2, ar: "الاستحواذ والعقود", en: "Site Acquisition", group: "DELIVERY" },
  { code: "CW_PROCUREMENT", order: 3, ar: "مشتريات الأعمال المدنية", en: "CW Procurement", group: "DELIVERY" },
  { code: "PRE_CW", order: 4, ar: "التصميم المدني والمسح", en: "Pre-CW (Survey/Layout)", group: "DELIVERY" },
  { code: "TOWER_ERECTION", order: 5, ar: "تركيب البرج", en: "Tower Erection", group: "DELIVERY" },
  { code: "SITE_ADAPTION", order: 6, ar: "تجهيز الموقع", en: "Site Adaption", group: "DELIVERY" },
  { code: "CW_ACCEPTANCE", order: 7, ar: "قبول الأعمال المدنية", en: "CW Acceptance (PAC)", group: "DELIVERY" },
  { code: "POWER", order: 8, ar: "الكهرباء (GECOL)", en: "Power (GECOL)", group: "DELIVERY" },
  { code: "FIBER", order: 9, ar: "الفايبر (HLC)", en: "Fiber (HLC)", group: "DELIVERY" },
  { code: "RFI", order: 10, ar: "جاهزية التركيب (RFI)", en: "Ready For Installation", group: "DELIVERY" },
  { code: "TE_INSTALLATION", order: 11, ar: "تركيب المعدات", en: "TE Installation", group: "DELIVERY" },
  { code: "ONAIR", order: 12, ar: "الإطلاق (On-Air)", en: "On-Air", group: "DELIVERY" },
  { code: "TESTING", order: 13, ar: "الاختبارات (EIR/PAT)", en: "Testing (EIR/PAT)", group: "DELIVERY" },
  { code: "TE_ACCEPTANCE", order: 14, ar: "القبول الفني (As-Built/PAC)", en: "TE Acceptance", group: "DELIVERY" },
  { code: "HANDOVER", order: 15, ar: "التسليم النهائي للتشغيل", en: "O&M Handover", group: "DELIVERY" },
  { code: "OPERATION", order: 16, ar: "التشغيل والصيانة", en: "Operation & Maintenance", group: "OPERATION" },
];

export const PHASE_BY_CODE: Record<string, PhaseDef> = Object.fromEntries(
  PHASES.map((p) => [p.code, p])
);

export const STATUS_LABELS: Record<MilestoneStatus, { ar: string; color: string }> = {
  DONE: { ar: "مكتمل", color: "emerald" },
  IN_PROGRESS: { ar: "قيد التنفيذ", color: "amber" },
  NOT_STARTED: { ar: "لم يبدأ", color: "slate" },
  NA: { ar: "غير مطلوب", color: "zinc" },
  BLOCKED: { ar: "معلّق", color: "red" },
};

export const OVERALL_LABELS: Record<OverallStatus, { ar: string; color: string }> = {
  NOT_STARTED: { ar: "لم يبدأ", color: "slate" },
  IN_PROGRESS: { ar: "قيد التنفيذ", color: "amber" },
  ONAIR: { ar: "على الهواء", color: "sky" },
  HANDED_OVER: { ar: "مُسلّم", color: "emerald" },
  IN_OPERATION: { ar: "قيد التشغيل", color: "emerald" },
  BLOCKED: { ar: "معلّق", color: "red" },
};

// ---- Helpers ----
const hasDate = (v: unknown): boolean => typeof v === "string" && v.length >= 8;
const isDone = (v: unknown): boolean =>
  typeof v === "string" && v.trim().toLowerCase() === "done";
const isNa = (v: unknown): boolean => {
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  return s === "n/a" || s === "na" || s === "no" || s === "";
};

export interface DerivedMilestone {
  phaseCode: string;
  phaseOrder: number;
  status: MilestoneStatus;
  plannedDate: string | null;
  actualDate: string | null;
}

export interface DerivedLifecycle {
  milestones: DerivedMilestone[];
  currentPhase: string;
  progressPct: number;
  isOnair: boolean;
  isHandedOver: boolean;
  overallStatus: OverallStatus;
  keyDates: {
    rfSurveyDate: string | null;
    prDate: string | null;
    cwPacDate: string | null;
    cwFacDate: string | null;
    rfiDate: string | null;
    teInstallDate: string | null;
    onairDate: string | null;
    patDate: string | null;
    omHandoverDate: string | null;
  };
}

type Raw = Record<string, any>;

function statusFrom(done: boolean, started: boolean, na: boolean): MilestoneStatus {
  if (done) return "DONE";
  if (na) return "NA";
  if (started) return "IN_PROGRESS";
  return "NOT_STARTED";
}

/**
 * Derive per-phase milestones + summary from the grouped raw phase payload
 * (the object produced by the extractor / stored in Site.phaseData).
 */
export function deriveLifecycle(raw: Raw): DerivedLifecycle {
  const d = raw?.design ?? {};
  const proc = raw?.procurement ?? {};
  const pre = raw?.preCw ?? {};
  const te = raw?.towerErection ?? {};
  const adapt = raw?.siteAdaption ?? {};
  const cwAcc = raw?.cwAcceptance ?? {};
  const pwr = raw?.power ?? {};
  const fib = raw?.fiber ?? {};
  const rfi = raw?.rfi ?? {};
  const tei = raw?.teInstallation ?? {};
  const onair = raw?.onair ?? {};
  const test = raw?.testing ?? {};
  const ho = raw?.handover ?? {};
  const sow = raw?.sow ?? {};

  const m: DerivedMilestone[] = [];
  const add = (
    code: string,
    status: MilestoneStatus,
    planned: unknown = null,
    actual: unknown = null
  ) =>
    m.push({
      phaseCode: code,
      phaseOrder: PHASE_BY_CODE[code].order,
      status,
      plannedDate: hasDate(planned) ? (planned as string) : null,
      actualDate: hasDate(actual) ? (actual as string) : null,
    });

  // 1 DESIGN
  add("DESIGN", statusFrom(hasDate(d.rfSurveyDate), hasDate(d.rfSurveyDate), false), null, d.rfSurveyDate);
  // 2 ACQUISITION
  {
    const done = isDone(d.acquisitionStatus) || hasDate(d.acquisitionDate);
    add("ACQUISITION", statusFrom(done, done, false), null, d.acquisitionDate);
  }
  // 3 CW_PROCUREMENT
  {
    const done = hasDate(proc.poDate);
    const started = hasDate(proc.prDate);
    add("CW_PROCUREMENT", statusFrom(done, started, false), proc.prDate, proc.poDate ?? proc.prDate);
  }
  // 4 PRE_CW
  {
    const done = hasDate(pre.layoutApproval);
    const started =
      hasDate(pre.accessPermissionDate) || hasDate(pre.surveyActual) || hasDate(pre.layoutSubmission);
    add("PRE_CW", statusFrom(done, started, false), pre.surveyPlan, pre.layoutApproval);
  }
  // 5 TOWER_ERECTION
  {
    const na = isNa(sow.towerErection) && !hasDate(te.installActualEnd) && !hasDate(te.mosActual);
    const done = hasDate(te.installActualEnd);
    const started = hasDate(te.mosActual) || hasDate(te.installPlanEnd);
    add("TOWER_ERECTION", statusFrom(done, started, na), te.installPlanEnd ?? te.mosPlan, te.installActualEnd);
  }
  // 6 SITE_ADAPTION
  {
    const na =
      isNa(sow.siteAdaption) && !hasDate(adapt.installActualEnd) && !hasDate(adapt.mosActual);
    const done = hasDate(adapt.installActualEnd);
    const started =
      hasDate(adapt.mosActual) ||
      [adapt.cabinetFoundation, adapt.cableTray, adapt.opticalFiber, adapt.acDcBox, adapt.siteGnd].some(isDone);
    add("SITE_ADAPTION", statusFrom(done, started, na), adapt.installPlanEnd ?? adapt.mosPlan, adapt.installActualEnd);
  }
  // 7 CW_ACCEPTANCE
  {
    const done = hasDate(cwAcc.pacActual) || hasDate(cwAcc.facActual);
    const started = hasDate(cwAcc.cwDate) || hasDate(cwAcc.pacPlan);
    add("CW_ACCEPTANCE", statusFrom(done, started, false), cwAcc.pacPlan, cwAcc.pacActual ?? cwAcc.facActual);
  }
  // 8 POWER
  {
    const na = isNa(sow.gecolRequired) && !hasDate(pwr.gecolInstallDate) && !hasDate(pwr.gecolPrDate);
    const done = hasDate(pwr.gecolInstallDate);
    const started = hasDate(pwr.gecolPrDate);
    add("POWER", statusFrom(done, started, na), pwr.gecolPrDate, pwr.gecolInstallDate);
  }
  // 9 FIBER
  {
    const na = isNa(sow.hlcRequired) && !hasDate(fib.hlcInstallDate) && !hasDate(fib.hlcPrDate);
    const done = hasDate(fib.hlcInstallDate);
    const started = hasDate(fib.hlcPrDate);
    add("FIBER", statusFrom(done, started, na), fib.hlcPrDate, fib.hlcInstallDate);
  }
  // 10 RFI
  {
    const done = hasDate(rfi.rfiDate);
    add("RFI", statusFrom(done, done, false), null, rfi.rfiDate);
  }
  // 11 TE_INSTALLATION
  {
    const done = hasDate(tei.teInstallDate) || hasDate(tei.installActualEnd);
    const started = hasDate(tei.mosActual) || hasDate(tei.surveyDate) || hasDate(tei.dnApproved);
    add("TE_INSTALLATION", statusFrom(done, started, false), tei.mosPlan ?? tei.installPlanEnd, tei.teInstallDate ?? tei.installActualEnd);
  }
  // 12 ONAIR
  {
    const done = hasDate(onair.onairDate);
    const started = hasDate(onair.commissioningDate) || hasDate(onair.integrationDate) || hasDate(onair.mwAlignmentDate);
    add("ONAIR", statusFrom(done, started, false), onair.planDate, onair.onairDate);
  }
  // 13 TESTING
  {
    const done = hasDate(test.patDate);
    const started = hasDate(test.eirDate) || [test.patPwr, test.patWl, test.patMw, test.patIp].some(isDone);
    add("TESTING", statusFrom(done, started, false), null, test.patDate);
  }
  // 14 TE_ACCEPTANCE (As-Built / TE PAC — stored as date or "Done" status)
  {
    const done =
      hasDate(ho.tePacDate) || isDone(ho.tePacStatus) || hasDate(ho.asBuiltDate) || isDone(ho.asBuiltStatus);
    const started = hasDate(ho.asBuiltDate) || isDone(ho.asBuiltStatus);
    add("TE_ACCEPTANCE", statusFrom(done, started, false), null, ho.tePacDate ?? ho.asBuiltDate);
  }
  // 15 HANDOVER (O&M handover — stored as date or "Done" status)
  {
    const done = hasDate(ho.omHandoverDate) || isDone(ho.omHandoverStatus);
    add("HANDOVER", statusFrom(done, done, false), null, ho.omHandoverDate);
  }
  // 16 OPERATION (ongoing once handed over)
  {
    const handedOver = hasDate(ho.omHandoverDate) || isDone(ho.omHandoverStatus);
    add("OPERATION", handedOver ? "IN_PROGRESS" : "NOT_STARTED", null, ho.omHandoverDate);
  }

  // ---- Summary ----
  const delivery = m.filter((x) => PHASE_BY_CODE[x.phaseCode].group === "DELIVERY");
  const considered = delivery.filter((x) => x.status !== "NA");
  const doneCount = considered.filter((x) => x.status === "DONE").length;
  const progressPct = considered.length
    ? Math.round((doneCount / considered.length) * 100)
    : 0;

  const isOnair = m.find((x) => x.phaseCode === "ONAIR")?.status === "DONE";
  const isHandedOver = m.find((x) => x.phaseCode === "HANDOVER")?.status === "DONE";

  // current phase = first delivery phase that is neither DONE nor NA; else OPERATION.
  const front = delivery
    .slice()
    .sort((a, b) => a.phaseOrder - b.phaseOrder)
    .find((x) => x.status !== "DONE" && x.status !== "NA");
  const currentPhase = isHandedOver ? "OPERATION" : front ? front.phaseCode : "HANDOVER";

  let overallStatus: OverallStatus;
  if (isHandedOver) overallStatus = "IN_OPERATION";
  else if (isOnair) overallStatus = "ONAIR";
  else if (m.some((x) => x.status === "BLOCKED")) overallStatus = "BLOCKED";
  else if (progressPct > 0) overallStatus = "IN_PROGRESS";
  else overallStatus = "NOT_STARTED";

  return {
    milestones: m,
    currentPhase,
    progressPct,
    isOnair,
    isHandedOver,
    overallStatus,
    keyDates: {
      rfSurveyDate: hasDate(d.rfSurveyDate) ? d.rfSurveyDate : null,
      prDate: hasDate(proc.prDate) ? proc.prDate : null,
      cwPacDate: hasDate(cwAcc.pacActual) ? cwAcc.pacActual : null,
      cwFacDate: hasDate(cwAcc.facActual) ? cwAcc.facActual : null,
      rfiDate: hasDate(rfi.rfiDate) ? rfi.rfiDate : null,
      teInstallDate: hasDate(tei.teInstallDate) ? tei.teInstallDate : null,
      onairDate: hasDate(onair.onairDate) ? onair.onairDate : null,
      patDate: hasDate(test.patDate) ? test.patDate : null,
      omHandoverDate: hasDate(ho.omHandoverDate) ? ho.omHandoverDate : null,
    },
  };
}
