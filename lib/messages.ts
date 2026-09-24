// Source-keyed localization: the SOURCE (Arabic) text of every UI string is its
// own key. Translations for other languages are stored in the Translation table
// keyed by that source text. The complete list of source strings is generated
// automatically from the codebase by scripts/extractI18n.js into i18nCatalog.ts,
// so the CSV export always contains every string in the system.

export const SOURCE_LOCALE = "ar";

// Full catalog of translatable source strings (auto-generated on build).
export { CATALOG as ALL_MESSAGE_KEYS } from "@/lib/i18nCatalog";
