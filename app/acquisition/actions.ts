"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deriveLifecycle } from "@/lib/lifecycle";
import { ownerTypeOf, stageLabel } from "@/lib/acquisition";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, AUDIT } from "@/lib/audit";

const actor = () => getCurrentUser();

const str = (fd: FormData, k: string): string | null => {
  const v = fd.get(k);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const num = (fd: FormData, k: string): number | null => {
  const s = str(fd, k);
  if (s === null) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
};
const date = (fd: FormData, k: string): Date | null => {
  const s = str(fd, k);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

function revalidateAcq(id?: string) {
  revalidatePath("/acquisition");
  if (id) revalidatePath(`/acquisition/${id}`);
}

// ---- Nominal points ----
export async function createNominalPoint(fd: FormData) {
  const ref = str(fd, "ref");
  if (!ref) return { ok: false, error: "المرجع مطلوب" };
  const exists = await prisma.nominalPoint.findUnique({ where: { ref } });
  if (exists) return { ok: false, error: "المرجع مستخدم مسبقاً" };
  const np = await prisma.nominalPoint.create({
    data: {
      ref,
      name: str(fd, "name"),
      latitude: num(fd, "latitude"),
      longitude: num(fd, "longitude"),
      region: str(fd, "region"),
      subRegion: str(fd, "subRegion"),
      notes: str(fd, "notes"),
    },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: await actor(),
    entity: "NominalPoint", entityId: np.id, entityLabel: ref,
    summary: `إنشاء نقطة اسمية: ${ref}`, after: { ref, name: np.name, region: np.region } });
  revalidateAcq();
  redirect(`/acquisition/${np.id}`);
}

// ---- Candidates ----
export async function addCandidate(fd: FormData) {
  const nominalPointId = str(fd, "nominalPointId");
  if (!nominalPointId) return { ok: false, error: "نقطة غير معروفة" };
  const towerOwner = str(fd, "towerOwner");
  const cand = await prisma.candidateSite.create({
    data: {
      nominalPointId,
      name: str(fd, "name"),
      latitude: num(fd, "latitude"),
      longitude: num(fd, "longitude"),
      proximityKm: num(fd, "proximityKm"),
      fiberAvailable: str(fd, "fiberAvailable"),
      easeOfProcedures: str(fd, "easeOfProcedures"),
      towerOwner,
      towerOwnerDetail: str(fd, "towerOwnerDetail"),
      ownerType: ownerTypeOf(towerOwner),
      sectorSiteId: ownerTypeOf(towerOwner) === "SECTOR" ? str(fd, "sectorSiteId") : null,
      contactPerson: str(fd, "contactPerson"),
      contactPhone: str(fd, "contactPhone"),
      address: str(fd, "address"),
      stage: "SUBMITTED",
    },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: await actor(),
    entity: "CandidateSite", entityId: cand.id, entityLabel: cand.name ?? "(بلا اسم)",
    summary: `إضافة مرشّح: ${cand.name ?? "(بلا اسم)"}`,
    after: { name: cand.name, towerOwner, latitude: cand.latitude, longitude: cand.longitude } });
  revalidateAcq(nominalPointId);
  return { ok: true };
}

// ---- Edit existing records (pre-filled forms, no re-entry) ----
export async function updateNominalPoint(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return { ok: false, error: "نقطة غير معروفة" };
  await prisma.nominalPoint.update({
    where: { id },
    data: {
      name: str(fd, "name"),
      latitude: num(fd, "latitude"),
      longitude: num(fd, "longitude"),
      region: str(fd, "region"),
      subRegion: str(fd, "subRegion"),
      notes: str(fd, "notes"),
    },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "UPDATE", actor: await actor(),
    entity: "NominalPoint", entityId: id, entityLabel: str(fd, "name") ?? id, summary: "تعديل نقطة اسمية" });
  revalidateAcq(id);
  return { ok: true };
}

export async function updateCandidate(fd: FormData) {
  const id = str(fd, "candidateId");
  if (!id) return { ok: false, error: "مرشّح غير معروف" };
  const towerOwner = str(fd, "towerOwner");
  const c = await prisma.candidateSite.update({
    where: { id },
    data: {
      name: str(fd, "name"),
      latitude: num(fd, "latitude"),
      longitude: num(fd, "longitude"),
      proximityKm: num(fd, "proximityKm"),
      fiberAvailable: str(fd, "fiberAvailable"),
      easeOfProcedures: str(fd, "easeOfProcedures"),
      towerOwner,
      towerOwnerDetail: str(fd, "towerOwnerDetail"),
      ownerType: ownerTypeOf(towerOwner),
      sectorSiteId: ownerTypeOf(towerOwner) === "SECTOR" ? str(fd, "sectorSiteId") : null,
      contactPerson: str(fd, "contactPerson"),
      contactPhone: str(fd, "contactPhone"),
      address: str(fd, "address"),
    },
    select: { nominalPointId: true, name: true },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "UPDATE", actor: await actor(),
    entity: "CandidateSite", entityId: id, entityLabel: c.name ?? id, summary: `تعديل مرشّح: ${c.name ?? id}` });
  revalidateAcq(c.nominalPointId);
  return { ok: true };
}

// Edit survey data WITHOUT changing the workflow stage.
export async function updateSurvey(fd: FormData) {
  const id = str(fd, "candidateId");
  if (!id) return { ok: false, error: "مرشّح غير معروف" };
  const c = await prisma.candidateSite.update({
    where: { id },
    data: {
      surveyDate: date(fd, "surveyDate"),
      towerInfo: str(fd, "towerInfo"),
      requiredHeights: str(fd, "requiredHeights"),
      proposedEquipment: str(fd, "proposedEquipment"),
      installationReq: str(fd, "installationReq"),
    },
    select: { nominalPointId: true, name: true },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "UPDATE", actor: await actor(),
    entity: "CandidateSite", entityId: id, entityLabel: c.name ?? id, summary: `تعديل بيانات مسح المرشّح: ${c.name ?? id}` });
  revalidateAcq(c.nominalPointId);
  return { ok: true };
}

async function setStage(
  candidateId: string,
  stage: string,
  extra: Record<string, any> = {}
) {
  const c = await prisma.candidateSite.update({
    where: { id: candidateId },
    data: { stage, ...extra },
    select: { nominalPointId: true, name: true },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "STAGE_CHANGE", actor: await actor(),
    entity: "CandidateSite", entityId: candidateId, entityLabel: c.name ?? candidateId,
    summary: `تغيير مرحلة المرشّح "${c.name ?? candidateId}" إلى: ${stageLabel(stage)}`,
    after: { stage, ...extra } });
  revalidateAcq(c.nominalPointId);
}

export async function approveCandidate(fd: FormData) {
  await setStage(String(fd.get("candidateId")), "APPROVED_CANDIDATE", {
    candidateApprovedAt: new Date(),
  });
  return { ok: true };
}
export async function requestSurvey(fd: FormData) {
  await setStage(String(fd.get("candidateId")), "SURVEY_REQUESTED");
  return { ok: true };
}
export async function grantSurvey(fd: FormData) {
  await setStage(String(fd.get("candidateId")), "SURVEY_APPROVED", {
    surveyPermittedAt: new Date(),
  });
  return { ok: true };
}
export async function recordSurvey(fd: FormData) {
  const id = String(fd.get("candidateId"));
  await setStage(id, "SURVEYED", {
    surveyDate: date(fd, "surveyDate"),
    towerInfo: str(fd, "towerInfo"),
    requiredHeights: str(fd, "requiredHeights"),
    proposedEquipment: str(fd, "proposedEquipment"),
    installationReq: str(fd, "installationReq"),
  });
  return { ok: true };
}
export async function approveTech(fd: FormData) {
  await setStage(String(fd.get("candidateId")), "TECH_APPROVED", {
    techApprovedAt: new Date(),
  });
  return { ok: true };
}
export async function approveFinal(fd: FormData) {
  const id = String(fd.get("candidateId"));
  await setStage(id, "FINAL_APPROVED", {
    finalApprovedAt: new Date(),
    address: str(fd, "address"),
    approvedHeights: str(fd, "approvedHeights"),
    approvedEquipment: str(fd, "approvedEquipment"),
    finalDocs: str(fd, "finalDocs"),
  });
  return { ok: true };
}
export async function rejectCandidate(fd: FormData) {
  const id = String(fd.get("candidateId"));
  await setStage(id, "REJECTED", {
    rejectionGate: str(fd, "gate"),
    rejectionReason: str(fd, "reason"),
  });
  return { ok: true };
}

// ---- Candidate equipment lines (type + manufacturer + quantity) ----
export async function addCandidateEquipment(fd: FormData) {
  const candidateId = str(fd, "candidateId");
  const equipmentType = str(fd, "equipmentType");
  if (!candidateId || !equipmentType) return { ok: false, error: "بيانات ناقصة" };
  const cand = await prisma.candidateSite.findUnique({
    where: { id: candidateId },
    select: { nominalPointId: true },
  });
  if (!cand) return { ok: false, error: "المرشّح غير موجود" };
  await prisma.candidateEquipment.create({
    data: {
      candidateId,
      equipmentType,
      manufacturer: str(fd, "manufacturer"),
      quantity: num(fd, "quantity") ?? 1,
    },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: await actor(),
    entity: "CandidateEquipment", entityId: candidateId, entityLabel: equipmentType,
    summary: `إضافة معدة للمرشّح: ${equipmentType} ×${num(fd, "quantity") ?? 1}` });
  revalidateAcq(cand.nominalPointId);
  return { ok: true };
}

export async function removeCandidateEquipment(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  const eq = await prisma.candidateEquipment.delete({
    where: { id },
    select: { equipmentType: true, candidate: { select: { nominalPointId: true } } },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "DELETE", actor: await actor(),
    entity: "CandidateEquipment", entityId: id, entityLabel: eq.equipmentType,
    summary: `حذف معدة من المرشّح: ${eq.equipmentType}` });
  revalidateAcq(eq.candidate.nominalPointId);
}

// ---- Convert an approved candidate into a real Site (enters the lifecycle) ----
export async function convertToSite(fd: FormData) {
  const candidateId = String(fd.get("candidateId"));
  const siteId = str(fd, "siteId");
  if (!siteId) return { ok: false, error: "معرّف الموقع مطلوب" };

  const cand = await prisma.candidateSite.findUnique({
    where: { id: candidateId },
    include: { nominalPoint: true },
  });
  if (!cand) return { ok: false, error: "المرشّح غير موجود" };
  if (cand.stage !== "FINAL_APPROVED")
    return { ok: false, error: "يجب اكتمال الاعتماد النهائي أولاً" };

  const dup = await prisma.site.findUnique({ where: { siteId } });
  if (dup) return { ok: false, error: "معرّف الموقع مستخدم مسبقاً" };

  const surveyIso = cand.surveyDate ? cand.surveyDate.toISOString().slice(0, 10) : null;
  const phaseData: Record<string, any> = {
    design: { rfSurveyDate: surveyIso, acquisitionStatus: "Done" },
    sow: {},
  };
  const derived = deriveLifecycle(phaseData);

  const site = await prisma.site.create({
    data: {
      siteId,
      name: cand.name ?? cand.nominalPoint.name,
      region: cand.nominalPoint.region,
      subRegion: cand.nominalPoint.subRegion,
      latitude: cand.latitude,
      longitude: cand.longitude,
      towerOwner: cand.towerOwner,
      existingOrNew: "New",
      currentPhase: derived.currentPhase,
      progressPct: derived.progressPct,
      overallStatus: derived.overallStatus,
      rfSurveyDate: cand.surveyDate,
      phaseData: JSON.stringify(phaseData),
      cwBoq: "{}",
      teBoq: "{}",
      milestones: {
        create: derived.milestones.map((m) => ({
          phaseCode: m.phaseCode,
          phaseOrder: m.phaseOrder,
          status: m.status,
          plannedDate: m.plannedDate ? new Date(m.plannedDate) : null,
          actualDate: m.actualDate ? new Date(m.actualDate) : null,
        })),
      },
    },
  });

  await prisma.candidateSite.update({
    where: { id: candidateId },
    data: { stage: "ACQUIRED", linkedSiteId: site.id },
  });
  await prisma.nominalPoint.update({
    where: { id: cand.nominalPointId },
    data: { status: "ACQUIRED" },
  });

  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: await actor(),
    entity: "Site", entityId: site.id, entityLabel: siteId,
    summary: `تحويل مرشّح إلى موقع: ${siteId}`,
    after: { siteId, name: site.name, fromCandidate: candidateId } });
  revalidateAcq(cand.nominalPointId);
  revalidatePath("/sites");
  redirect(`/sites/${site.id}/edit`);
}
