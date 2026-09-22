"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deriveLifecycle } from "@/lib/lifecycle";
import { SECTION_BY_ID, FieldDef } from "@/lib/formSchema";
import { parseMasterSites, buildSiteData } from "@/lib/importMaster";

function coerce(field: FieldDef, raw: FormDataEntryValue | null): any {
  if (raw === null) return undefined;
  const str = String(raw).trim();
  if (str === "") return null;
  if (field.type === "number") {
    const num = Number(str);
    return isNaN(num) ? null : num;
  }
  // date stays "YYYY-MM-DD"; text/select/textarea stay strings
  return str;
}

const toDate = (v: string | null): Date | null => {
  if (!v) return null;
  const dt = new Date(v);
  return isNaN(dt.getTime()) ? null : dt;
};

interface Applied {
  siteColumns: Record<string, any>;
  phaseData: Record<string, any>;
}

/** Apply a section's submitted fields onto site columns + phaseData. */
function applySection(
  sectionId: string,
  formData: FormData,
  basePhaseData: Record<string, any>,
  isEdit: boolean
): Applied {
  const section = SECTION_BY_ID[sectionId];
  const siteColumns: Record<string, any> = {};
  const phaseData: Record<string, any> = { ...basePhaseData };
  if (!section) return { siteColumns, phaseData };

  for (const field of section.fields) {
    if (isEdit && field.readOnlyOnEdit) continue;
    const raw = formData.get(field.path);
    if (raw === null) continue; // not part of this form submission
    const val = coerce(field, raw);
    const parts = field.path.split(".");
    if (parts[0] === "site") {
      siteColumns[parts[1]] = val;
    } else if (parts[0] === "phase") {
      const [, group, key] = parts;
      phaseData[group] = { ...(phaseData[group] ?? {}) };
      phaseData[group][key] = val;
    }
  }
  return { siteColumns, phaseData };
}

/** Build the full Site update payload from merged phaseData + edited columns. */
function buildSiteUpdate(siteColumns: Record<string, any>, phaseData: Record<string, any>) {
  const derived = deriveLifecycle(phaseData);
  const sow = phaseData.sow ?? {};
  return {
    update: {
      ...siteColumns,
      phaseData: JSON.stringify(phaseData),
      currentPhase: derived.currentPhase,
      progressPct: derived.progressPct,
      isOnair: derived.isOnair,
      isHandedOver: derived.isHandedOver,
      overallStatus: derived.overallStatus,
      sowTowerErection: sow.towerErection != null ? String(sow.towerErection) : null,
      sowSiteAdaption: sow.siteAdaption != null ? String(sow.siteAdaption) : null,
      sowGecolRequired: sow.gecolRequired != null ? String(sow.gecolRequired) : null,
      sowHlcRequired: sow.hlcRequired != null ? String(sow.hlcRequired) : null,
      rfSurveyDate: toDate(derived.keyDates.rfSurveyDate),
      prDate: toDate(derived.keyDates.prDate),
      cwPacDate: toDate(derived.keyDates.cwPacDate),
      cwFacDate: toDate(derived.keyDates.cwFacDate),
      rfiDate: toDate(derived.keyDates.rfiDate),
      teInstallDate: toDate(derived.keyDates.teInstallDate),
      onairDate: toDate(derived.keyDates.onairDate),
      patDate: toDate(derived.keyDates.patDate),
      omHandoverDate: toDate(derived.keyDates.omHandoverDate),
    },
    milestones: derived.milestones,
  };
}

/** Save one section's data for an existing site. */
export async function saveSiteSection(formData: FormData) {
  const siteId = String(formData.get("__siteId") ?? "");
  const sectionId = String(formData.get("__sectionId") ?? "");
  if (!siteId || !sectionId) return { ok: false, error: "بيانات ناقصة" };

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) return { ok: false, error: "الموقع غير موجود" };

  const base = site.phaseData ? safeParse(site.phaseData) : {};
  const { siteColumns, phaseData } = applySection(sectionId, formData, base, true);
  const { update, milestones } = buildSiteUpdate(siteColumns, phaseData);

  await prisma.$transaction([
    prisma.site.update({ where: { id: siteId }, data: update }),
    prisma.milestone.deleteMany({ where: { siteId } }),
    prisma.milestone.createMany({
      data: milestones.map((m) => ({
        siteId,
        phaseCode: m.phaseCode,
        phaseOrder: m.phaseOrder,
        status: m.status,
        plannedDate: toDate(m.plannedDate),
        actualDate: toDate(m.actualDate),
      })),
    }),
  ]);

  revalidatePath(`/sites/${siteId}`);
  revalidatePath(`/sites/${siteId}/edit`);
  revalidatePath("/sites");
  revalidatePath("/");
  return { ok: true, ts: Date.now() };
}

/** Create a new site from the Site Information section, then open its editor. */
export async function createSite(formData: FormData) {
  const code = String(formData.get("site.siteId") ?? "").trim();
  if (!code) return { ok: false, error: "معرّف الموقع مطلوب" };

  const exists = await prisma.site.findUnique({ where: { siteId: code } });
  if (exists) return { ok: false, error: "معرّف الموقع مستخدم مسبقاً" };

  const { siteColumns, phaseData } = applySection("site-info", formData, {}, false);
  delete siteColumns.siteId; // set explicitly below
  const { update, milestones } = buildSiteUpdate(siteColumns, phaseData);

  const created = await prisma.site.create({
    data: {
      siteId: code,
      ...update,
      milestones: {
        create: milestones.map((m) => ({
          phaseCode: m.phaseCode,
          phaseOrder: m.phaseOrder,
          status: m.status,
          plannedDate: toDate(m.plannedDate),
          actualDate: toDate(m.actualDate),
        })),
      },
    },
  });

  revalidatePath("/sites");
  revalidatePath("/");
  redirect(`/sites/${created.id}/edit`);
}

function safeParse(json: string): Record<string, any> {
  try {
    return JSON.parse(json) ?? {};
  } catch {
    return {};
  }
}

// ---- Update/insert sites from an uploaded GSDN Master workbook ----
export async function importSitesFromExcel(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "لم يتم اختيار ملف." };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, error: "حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت)." };
  }

  let rows: any[];
  try {
    rows = parseMasterSites(await file.arrayBuffer());
  } catch (e: any) {
    return { ok: false, error: e?.message || "تعذّر قراءة الملف. تأكّد أنه بصيغة GSDN Master." };
  }
  if (rows.length === 0) {
    return { ok: false, error: "لم يتم العثور على مواقع في الملف." };
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    try {
      const { scalars, milestones } = buildSiteData(raw);
      const existing = await prisma.site.findUnique({
        where: { siteId: raw.siteId },
        select: { id: true },
      });
      if (existing) {
        await prisma.$transaction([
          prisma.site.update({ where: { id: existing.id }, data: scalars }),
          prisma.milestone.deleteMany({ where: { siteId: existing.id } }),
          prisma.milestone.createMany({
            data: milestones.map((m) => ({ ...m, siteId: existing.id })),
          }),
        ]);
        updated++;
      } else {
        await prisma.site.create({
          data: { siteId: raw.siteId, ...scalars, milestones: { create: milestones } },
        });
        created++;
      }
    } catch (e: any) {
      failed++;
      if (errors.length < 5) errors.push(`${raw.siteId}: ${e?.message ?? "خطأ"}`);
    }
  }

  revalidatePath("/sites");
  revalidatePath("/");
  return { ok: true, total: rows.length, created, updated, failed, errors };
}
