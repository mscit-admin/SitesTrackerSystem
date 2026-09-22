// Shared constants for the generic two-step deletion workflow (no server imports
// so this is safe to use from client components too).

export const ENTITY_AR: Record<string, string> = {
  SITE: "موقع",
  NOMINAL_POINT: "نقطة اسمية",
  RISK: "مخاطرة",
  MAINTENANCE_TICKET: "بلاغ صيانة",
  PREVENTIVE: "مهمة صيانة دورية",
};

export const DEL_STATUS: Record<string, { ar: string; cls: string }> = {
  PENDING: { ar: "بانتظار مسؤول المرحلة", cls: "bg-amber-50 text-amber-700 border-amber-100" },
  PHASE_APPROVED: { ar: "بانتظار مدير المشروع", cls: "bg-sky-50 text-sky-700 border-sky-100" },
  COMPLETED: { ar: "تم الحذف", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  REJECTED: { ar: "مرفوض", cls: "bg-red-50 text-red-700 border-red-100" },
};
