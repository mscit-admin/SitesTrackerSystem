// Schema for the per-phase data-entry screens.
// Each field's `path` is the save target:
//   site.<column>        -> a column on the Site row
//   phase.<group>.<key>  -> nested value inside Site.phaseData (JSON)
// The same schema drives both form rendering and the save action.

export type FieldType = "text" | "number" | "date" | "select" | "textarea";

export interface FieldDef {
  path: string;
  label: string;
  type: FieldType;
  options?: string[];
  col?: 1 | 2; // layout width hint
  keyField?: boolean; // the site code (editable only on create)
  readOnlyOnEdit?: boolean;
}

export interface SectionDef {
  id: string;
  title: string;
  hint?: string;
  fields: FieldDef[];
}

// ---- option lists (from the master workbook's distinct values) ----
const REGIONS = ["Middle Area", "Tripoli Area", "Zawia Area", "WM Area"];
const SCENARIO = ["Outdoor", "Indoor"];
const SITE_TYPE = ["FN", "HUB", "Terminal", "MFN", "Core"];
const EXISTING = ["Existing", "New"];
const RTGF = ["GF", "RT"];
const TOWER_TYPE = ["SST", "GMT", "Monopole", "Pole Tower"];
const BATCH = ["Batch 0", "Batch 1", "Batch 2", "Batch 3"];
const YESNO = ["Yes", "No", "N/A"];
const DONE = ["Done", "N/A"];

// ---- field builder shortcuts ----
const d = (path: string, label: string, col: 1 | 2 = 1): FieldDef => ({ path, label, type: "date", col });
const t = (path: string, label: string, col: 1 | 2 = 1): FieldDef => ({ path, label, type: "text", col });
const n = (path: string, label: string, col: 1 | 2 = 1): FieldDef => ({ path, label, type: "number", col });
const s = (path: string, label: string, options: string[], col: 1 | 2 = 1): FieldDef => ({ path, label, type: "select", options, col });

export const SECTIONS: SectionDef[] = [
  {
    id: "site-info",
    title: "معلومات الموقع",
    hint: "المعرّف والاسم والبرج والموقع الجغرافي والطوبولوجيا",
    fields: [
      { path: "site.siteId", label: "معرّف الموقع (Site ID)", type: "text", keyField: true, readOnlyOnEdit: true },
      t("site.name", "اسم الموقع"),
      t("site.towerOwner", "مالك البرج"),
      t("site.ownerSiteId", "معرّف موقع المالك"),
      n("site.latitude", "خط العرض (Latitude)"),
      n("site.longitude", "خط الطول (Longitude)"),
      s("site.region", "المنطقة", REGIONS),
      t("site.subRegion", "المنطقة الفرعية"),
      s("site.scenario", "السيناريو", SCENARIO),
      s("site.siteType", "نوع الموقع", SITE_TYPE),
      s("site.existingOrNew", "قائم / جديد", EXISTING),
      s("site.rtOrGf", "RT / GF", RTGF),
      s("site.towerType", "نوع البرج", TOWER_TYPE),
      n("site.towerHeight", "ارتفاع البرج (م)"),
      n("site.busbarHeight", "ارتفاع البَص بار (م)"),
      s("site.deliveryBatch", "دُفعة التسليم", BATCH),
      t("site.cabinetFoundationType", "قاعدة الكابينة: قائمة/جديدة"),
      t("site.cabinetFoundationDims", "أبعاد القاعدة (م)"),
      t("site.uplinkSite", "موقع الوصلة الصاعدة (Uplink)"),
      t("site.backupSite", "الموقع الاحتياطي (Backup)"),
      t("site.belongToFN", "تابع لـ FN"),
      t("site.primaryMFN", "MFN الأساسي"),
      t("site.secondaryMFN", "MFN الثانوي"),
    ],
  },
  {
    id: "design",
    title: "التصميم والاستحواذ",
    hint: "المسح الراديوي، الاستحواذ، ونطاق العمل (SOW)",
    fields: [
      d("phase.design.rfSurveyDate", "تاريخ المسح الراديوي (RF Survey)"),
      d("phase.design.acquisitionDate", "تاريخ الاستحواذ"),
      s("phase.design.acquisitionStatus", "حالة الاستحواذ", DONE),
      s("phase.sow.towerErection", "مطلوب تركيب برج؟", YESNO),
      s("phase.sow.siteAdaption", "مطلوب تجهيز موقع؟", YESNO),
      s("phase.sow.gecolRequired", "مطلوب كهرباء (GECOL)؟", YESNO),
      s("phase.sow.hlcRequired", "مطلوب فايبر (HLC)؟", YESNO),
    ],
  },
  {
    id: "procurement",
    title: "مشتريات الأعمال المدنية",
    fields: [
      d("phase.procurement.prDate", "تاريخ طلب الشراء (PR)"),
      d("phase.procurement.poDate", "تاريخ أمر الشراء (PO)"),
      t("phase.procurement.contractor", "المقاول"),
    ],
  },
  {
    id: "preCw",
    title: "التصميم المدني والمسح (Pre-CW)",
    fields: [
      d("phase.preCw.accessPermissionDate", "تاريخ إذن الدخول"),
      t("phase.preCw.seName", "اسم مهندس الموقع (SE)"),
      d("phase.preCw.surveyPlan", "المسح — مخطط"),
      d("phase.preCw.surveyActual", "المسح — فعلي"),
      d("phase.preCw.staPlan", "STA — مخطط"),
      d("phase.preCw.staActual", "STA — فعلي"),
      d("phase.preCw.layoutSubmission", "تقديم المخطط (Layout)"),
      d("phase.preCw.layoutApproval", "اعتماد المخطط (Layout)"),
    ],
  },
  {
    id: "towerErection",
    title: "تركيب البرج",
    fields: [
      d("phase.towerErection.mosPlan", "MOS — مخطط"),
      d("phase.towerErection.mosActual", "MOS — فعلي"),
      d("phase.towerErection.installPlanEnd", "نهاية التركيب — مخطط"),
      d("phase.towerErection.installActualEnd", "نهاية التركيب — فعلي"),
    ],
  },
  {
    id: "siteAdaption",
    title: "تجهيز الموقع",
    fields: [
      d("phase.siteAdaption.mosPlan", "MOS — مخطط"),
      d("phase.siteAdaption.mosActual", "MOS — فعلي"),
      s("phase.siteAdaption.cabinetFoundation", "قاعدة الكابينة", DONE),
      s("phase.siteAdaption.mountingPole", "عمود التثبيت", DONE),
      s("phase.siteAdaption.cableTray", "مجرى الكابلات", DONE),
      s("phase.siteAdaption.indoorRack", "الرف الداخلي", DONE),
      s("phase.siteAdaption.opticalFiber", "الفايبر البصري", DONE),
      s("phase.siteAdaption.acDcBox", "صندوق AC/DC", DONE),
      s("phase.siteAdaption.siteGnd", "التأريض", DONE),
      d("phase.siteAdaption.installPlanEnd", "نهاية التجهيز — مخطط"),
      d("phase.siteAdaption.installActualEnd", "نهاية التجهيز — فعلي"),
    ],
  },
  {
    id: "cwAcceptance",
    title: "قبول الأعمال المدنية",
    fields: [
      d("phase.cwAcceptance.cwDate", "تاريخ الأعمال المدنية"),
      d("phase.cwAcceptance.pacPlan", "PAC — مخطط"),
      t("phase.cwAcceptance.pacSnagsCleared", "الملاحظات المُعالجة (PAC)"),
      d("phase.cwAcceptance.pacActual", "PAC — فعلي"),
      d("phase.cwAcceptance.dlpStart", "بداية فترة الضمان (DLP)"),
      d("phase.cwAcceptance.dlpEnd", "نهاية فترة الضمان (DLP)"),
      d("phase.cwAcceptance.facActual", "FAC — فعلي"),
    ],
  },
  {
    id: "power",
    title: "الكهرباء (GECOL)",
    fields: [
      d("phase.power.gecolPrDate", "تاريخ طلب الكهرباء (PR)"),
      d("phase.power.gecolInstallDate", "تاريخ تركيب الكهرباء"),
    ],
  },
  {
    id: "fiber",
    title: "الفايبر (HLC)",
    fields: [
      d("phase.fiber.hlcPrDate", "تاريخ طلب الفايبر (PR)"),
      d("phase.fiber.hlcInstallDate", "تاريخ تركيب الفايبر"),
    ],
  },
  {
    id: "rfi",
    title: "جاهزية التركيب (RFI)",
    fields: [d("phase.rfi.rfiDate", "تاريخ الجاهزية للتركيب")],
  },
  {
    id: "teInstallation",
    title: "تركيب المعدات",
    fields: [
      d("phase.teInstallation.accessPermissionDate", "تاريخ إذن الدخول"),
      t("phase.teInstallation.vendor", "المورّد"),
      t("phase.teInstallation.seName", "اسم مهندس الموقع (SE)"),
      d("phase.teInstallation.surveyDate", "تاريخ المسح"),
      d("phase.teInstallation.dnSubmitted", "تقديم DN"),
      d("phase.teInstallation.dnApproved", "اعتماد DN"),
      d("phase.teInstallation.mosPlan", "MOS — مخطط"),
      d("phase.teInstallation.mosActual", "MOS — فعلي"),
      s("phase.teInstallation.mtsCabinet", "كابينة MTS", DONE),
      s("phase.teInstallation.ipRouter", "راوتر IP الداخلي", DONE),
      s("phase.teInstallation.rfAntenna", "هوائي RF", DONE),
      s("phase.teInstallation.mwAntenna", "هوائي MW", DONE),
      s("phase.teInstallation.dcOfCable", "كابل DC/OF", DONE),
      d("phase.teInstallation.installPlanEnd", "نهاية التركيب — مخطط"),
      d("phase.teInstallation.installActualEnd", "نهاية التركيب — فعلي"),
      d("phase.teInstallation.teInstallDate", "تاريخ تركيب المعدات"),
    ],
  },
  {
    id: "onair",
    title: "الإطلاق (On-Air)",
    fields: [
      d("phase.onair.planDate", "مخطط الإطلاق"),
      d("phase.onair.commissioningDate", "التشغيل (Commissioning)"),
      d("phase.onair.mwAlignmentDate", "محاذاة MW"),
      d("phase.onair.integrationDate", "الدمج (Integration)"),
      d("phase.onair.onairDate", "تاريخ الإطلاق (On-Air)"),
    ],
  },
  {
    id: "testing",
    title: "الاختبارات (EIR / PAT)",
    fields: [
      d("phase.testing.hwInstallDocDate", "توثيق تركيب الأجهزة"),
      s("phase.testing.eirPwr", "EIR — الطاقة", DONE),
      s("phase.testing.eirWl", "EIR — اللاسلكي", DONE),
      s("phase.testing.eirMw", "EIR — الميكروويف", DONE),
      s("phase.testing.eirIp", "EIR — الشبكة", DONE),
      d("phase.testing.eirDate", "تاريخ EIR"),
      s("phase.testing.patPwr", "PAT — الطاقة", DONE),
      s("phase.testing.patWl", "PAT — اللاسلكي", DONE),
      s("phase.testing.patMw", "PAT — الميكروويف", DONE),
      s("phase.testing.patIp", "PAT — الشبكة", DONE),
      d("phase.testing.patDate", "تاريخ PAT"),
      t("phase.testing.snagsCleared", "الملاحظات المُعالجة"),
    ],
  },
  {
    id: "handover",
    title: "القبول والتسليم النهائي",
    fields: [
      d("phase.handover.asBuiltDate", "تاريخ As-Built"),
      s("phase.handover.asBuiltStatus", "حالة As-Built", DONE),
      d("phase.handover.tePacDate", "تاريخ PAC الفني"),
      s("phase.handover.tePacStatus", "حالة PAC الفني", DONE),
      d("phase.handover.omHandoverDate", "تاريخ التسليم للتشغيل (O&M)"),
      s("phase.handover.omHandoverStatus", "حالة التسليم للتشغيل", DONE),
    ],
  },
];

export const SECTION_BY_ID: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s])
);

export const FIELD_BY_PATH: Record<string, FieldDef> = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields).map((f) => [f.path, f])
);
