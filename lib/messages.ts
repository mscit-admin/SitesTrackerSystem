// Master message catalog. Every user-facing string has a stable KEY here with its
// SOURCE text (Arabic). Other languages override these via the Translation table
// (managed from Settings → Languages, translated through CSV export/import).
//
// To make a NEW string localizable: add a key here and render it with t("key").
// It then appears automatically in the CSV export for every language.

export const SOURCE_LOCALE = "ar";

export const MESSAGES: Record<string, string> = {
  // ---- app / brand ----
  "app.title": "نظام متابعة مواقع GSDN",
  "app.subtitle": "متابعة مواقع الاتصالات",
  "app.company": "شركة الجيل الجديد — aat",
  "app.network": "شبكة البيانات الحكومية الآمنة",
  "app.workspace": "مساحة العمل",

  // ---- navigation ----
  "nav.dashboard": "لوحة المؤشرات",
  "nav.acquisition": "الاستحواذ",
  "nav.sites": "المواقع",
  "nav.maintenance": "التشغيل والصيانة",
  "nav.risks": "سجل المخاطر",
  "nav.deletions": "طلبات الحذف",
  "nav.users": "المستخدمون والصلاحيات",
  "nav.settings": "الإعدادات",

  // ---- common actions ----
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.add": "إضافة",
  "common.edit": "تعديل",
  "common.delete": "حذف",
  "common.close": "إغلاق",
  "common.confirm": "تأكيد",
  "common.search": "بحث",
  "common.export": "تصدير",
  "common.import": "استيراد",
  "common.saved": "تم الحفظ",
  "common.loading": "جارٍ التحميل…",
  "common.yes": "نعم",
  "common.no": "لا",
  "common.actions": "إجراءات",
  "common.status": "الحالة",
  "common.home": "الرئيسية",

  // ---- login ----
  "login.heading": "سجّل الدخول للمتابعة",
  "login.identifier": "البريد الإلكتروني أو الرقم الوظيفي",
  "login.password": "كلمة المرور",
  "login.submit": "دخول",
  "login.submitting": "جارٍ الدخول…",
  "login.twofa": "رمز التحقق (2FA)",
  "login.twofaHint": "أدخل الرمز من تطبيق المصادقة (Google Authenticator / Authy).",
  "login.invalid": "بيانات الدخول غير صحيحة",
  "login.timedOut": "انتهت الجلسة لعدم النشاط. تم حفظ عملك غير المكتمل كمسودة.",

  // ---- user menu / account ----
  "account.profile": "الملف الشخصي والصورة",
  "account.password": "تغيير كلمة المرور",
  "account.twofa": "المصادقة الثنائية (2FA)",
  "account.logout": "تسجيل الخروج",

  // ---- settings / localization ----
  "settings.title": "الإعدادات",
  "settings.security": "الأمان والجلسة",
  "settings.languages": "اللغات والترجمة",
  "lang.title": "اللغات والترجمة",
  "lang.subtitle": "أضف لغات الواجهة وصدّر/استورد ملفات الترجمة (CSV)",
  "lang.add": "لغة جديدة",
  "lang.name": "اسم اللغة",
  "lang.abbr": "اختصار اللغة",
  "lang.code": "رمز اللغة في النظام",
  "lang.direction": "اتجاه الكتابة",
  "lang.rtl": "من اليمين لليسار (RTL)",
  "lang.ltr": "من اليسار لليمين (LTR)",
  "lang.default": "الافتراضية",
  "lang.enabled": "مفعّلة",
  "lang.setDefault": "تعيين كافتراضية",
  "lang.exportCsv": "تصدير CSV للترجمة",
  "lang.importCsv": "استيراد CSV",
  "lang.switch": "اللغة",
};

export const ALL_MESSAGE_KEYS = Object.keys(MESSAGES);
