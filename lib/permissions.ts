// Central permission catalog — the "matrix" of what can be granted to a role.
// Structure: Module → Group (sub-section) → Action. Each action has a unique
// dotted key stored in Role.permissions (a JSON array). Wildcards are supported:
//   "*"                every permission
//   "sites.*"          every permission under the sites module
//   "sites.phase.*"    every action in that group
//
// Pure module (no server imports) — safe to import on client and server.

export interface PermAction {
  key: string;
  label: string;
}
export interface PermGroup {
  id: string;
  label: string;
  actions: PermAction[];
}
export interface PermModule {
  id: string;
  label: string;
  groups: PermGroup[];
}

const A = (key: string, label: string): PermAction => ({ key, label });

// lifecycle phase sections (mirrors lib/formSchema SECTIONS ids)
const PHASE_SECTIONS: [string, string][] = [
  ["site-info", "معلومات الموقع"],
  ["design", "التصميم والاستحواذ"],
  ["procurement", "المشتريات"],
  ["preCw", "التصميم المدني والمسح"],
  ["towerErection", "تركيب البرج"],
  ["siteAdaption", "تجهيز الموقع"],
  ["cwAcceptance", "قبول الأعمال المدنية"],
  ["power", "الكهرباء (GECOL)"],
  ["fiber", "الفايبر (HLC)"],
  ["rfi", "جاهزية التركيب (RFI)"],
  ["teInstallation", "تركيب المعدات"],
  ["onair", "الإطلاق (On-Air)"],
  ["testing", "الاختبارات (EIR/PAT)"],
  ["handover", "القبول والتسليم"],
];

export const PERMISSION_CATALOG: PermModule[] = [
  {
    id: "dashboard",
    label: "لوحة المؤشرات",
    groups: [{ id: "dashboard", label: "لوحة المؤشرات", actions: [A("dashboard.view", "عرض")] }],
  },
  {
    id: "sites",
    label: "المواقع",
    groups: [
      {
        id: "record",
        label: "سجل الموقع",
        actions: [
          A("sites.view", "عرض القائمة والتفاصيل"),
          A("sites.create", "إضافة موقع"),
          A("sites.delete", "طلب حذف"),
          A("sites.export", "تحميل/تحديث إكسل"),
        ],
      },
      {
        id: "phase",
        label: "تعديل مراحل الموقع",
        actions: PHASE_SECTIONS.flatMap(([id, label]) => [
          A(`sites.phase.${id}.view`, `عرض: ${label}`),
          A(`sites.phase.${id}.edit`, `تعديل: ${label}`),
        ]),
      },
    ],
  },
  {
    id: "acquisition",
    label: "الاستحواذ",
    groups: [
      {
        id: "point",
        label: "النقاط الاسمية",
        actions: [
          A("acquisition.view", "عرض"),
          A("acquisition.point.create", "إنشاء نقطة"),
          A("acquisition.point.edit", "تعديل نقطة"),
          A("acquisition.point.delete", "حذف نقطة"),
        ],
      },
      {
        id: "candidate",
        label: "المرشّحون",
        actions: [
          A("acquisition.candidate.create", "إضافة مرشّح"),
          A("acquisition.candidate.edit", "تعديل مرشّح"),
          A("acquisition.candidate.equipment", "تحديد المعدات"),
        ],
      },
      {
        id: "gate",
        label: "بوّابات الاعتماد",
        actions: [
          A("acquisition.gate.approveCandidate", "اعتماد المرشّح"),
          A("acquisition.gate.surveyPermit", "إذن المسح"),
          A("acquisition.gate.techApproval", "الاعتماد الفني"),
          A("acquisition.gate.finalApproval", "الاعتماد النهائي"),
          A("acquisition.gate.reject", "رفض / إعادة"),
          A("acquisition.convert", "التحويل إلى موقع"),
        ],
      },
    ],
  },
  {
    id: "maintenance",
    label: "التشغيل والصيانة",
    groups: [
      {
        id: "preventive",
        label: "الصيانة الدورية",
        actions: [A("maintenance.view", "عرض"), A("maintenance.preventive.complete", "إنجاز مهمة دورية")],
      },
      {
        id: "ticket",
        label: "بلاغات الصيانة",
        actions: [
          A("maintenance.ticket.create", "تسجيل بلاغ"),
          A("maintenance.ticket.resolve", "حل بلاغ"),
        ],
      },
    ],
  },
  {
    id: "risks",
    label: "سجل المخاطر",
    groups: [
      {
        id: "risks",
        label: "المخاطر",
        actions: [
          A("risks.view", "عرض"),
          A("risks.create", "إضافة"),
          A("risks.edit", "تعديل"),
          A("risks.delete", "حذف"),
        ],
      },
    ],
  },
  {
    id: "deletions",
    label: "طلبات الحذف",
    groups: [
      {
        id: "deletions",
        label: "اعتماد الحذف",
        actions: [
          A("deletions.view", "عرض الطلبات"),
          A("deletions.approvePhase", "اعتماد مسؤول المرحلة"),
          A("deletions.approvePM", "اعتماد مدير المشروع"),
          A("deletions.reject", "رفض"),
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات",
    groups: [
      {
        id: "settings",
        label: "الإعدادات والقوائم المرجعية",
        actions: [A("settings.view", "عرض"), A("settings.edit", "تعديل")],
      },
    ],
  },
  {
    id: "localization",
    label: "اللغات والترجمة",
    groups: [
      {
        id: "localization",
        label: "التعريب",
        actions: [
          A("localization.view", "عرض شاشة اللغات"),
          A("localization.languages", "إدارة اللغات (إضافة/تعديل/افتراضية)"),
          A("localization.translate", "تصدير/استيراد الترجمة (CSV)"),
        ],
      },
    ],
  },
  {
    id: "users",
    label: "المستخدمون",
    groups: [
      {
        id: "users",
        label: "إدارة المستخدمين",
        actions: [
          A("users.view", "عرض"),
          A("users.create", "إنشاء مستخدم"),
          A("users.edit", "تعديل مستخدم"),
          A("users.deactivate", "تعطيل/تفعيل"),
          A("users.resetPassword", "إعادة تعيين كلمة المرور"),
        ],
      },
      {
        id: "roles",
        label: "الأدوار والصلاحيات",
        actions: [
          A("roles.view", "عرض الأدوار"),
          A("roles.create", "إنشاء دور"),
          A("roles.edit", "تعديل مصفوفة الصلاحيات"),
          A("roles.delete", "حذف دور"),
        ],
      },
    ],
  },
];

// Flat list of every real (non-wildcard) permission key.
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((m) =>
  m.groups.flatMap((g) => g.actions.map((a) => a.key))
);

/** Does a set of granted keys (which may contain wildcards) satisfy `key`? */
export function permGranted(granted: string[], key: string): boolean {
  if (granted.includes("*") || granted.includes(key)) return true;
  const parts = key.split(".");
  // check every ancestor wildcard, e.g. sites.*, sites.phase.*, ...
  for (let i = 1; i < parts.length; i++) {
    if (granted.includes(parts.slice(0, i).join(".") + ".*")) return true;
  }
  return false;
}

/** Parse a Role.permissions JSON string into a string[]. */
export function parsePerms(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
