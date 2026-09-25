"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, AUDIT } from "@/lib/audit";

const actor = () => getCurrentUser();

const VALID = ["SITE", "NOMINAL_POINT", "RISK", "MAINTENANCE_TICKET", "PREVENTIVE"];

function revalidateAll() {
  for (const p of ["/sites", "/acquisition", "/risks", "/maintenance", "/deletions", "/"]) {
    revalidatePath(p);
  }
}

export async function requestDeletion(formData: FormData) {
  const entityType = String(formData.get("entityType") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  const label = String(formData.get("label") ?? "").trim() || "—";
  const sublabel = String(formData.get("sublabel") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim();

  if (!VALID.includes(entityType) || !entityId) return { ok: false, error: "بيانات غير صالحة" };
  if (reason.length < 3) return { ok: false, error: "سبب الحذف مطلوب" };

  const open = await prisma.deletionRequest.findFirst({
    where: { entityType, entityId, status: { in: ["PENDING", "PHASE_APPROVED"] } },
    select: { id: true },
  });
  if (open) return { ok: false, error: "يوجد طلب حذف قيد المعالجة لهذا العنصر" };

  const dr = await prisma.deletionRequest.create({
    data: { entityType, entityId, label, sublabel, reason, status: "PENDING" },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: await actor(),
    entity: "DeletionRequest", entityId: dr.id, entityLabel: label,
    summary: `طلب حذف ${entityType}: ${label}`, after: { entityType, targetId: entityId, reason } });
  revalidateAll();
  return { ok: true };
}

export async function approveDeletionPhase(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const res = await prisma.deletionRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "PHASE_APPROVED", phaseApprovedAt: new Date() },
  });
  if (res.count > 0) {
    const req = await prisma.deletionRequest.findUnique({ where: { id }, select: { label: true, entityType: true } });
    await logAudit({ category: AUDIT.SECURITY, action: "UPDATE", actor: await actor(),
      entity: "DeletionRequest", entityId: id, entityLabel: req?.label ?? id,
      summary: `اعتماد مسؤول المرحلة لطلب حذف ${req?.entityType ?? ""}: ${req?.label ?? id}` });
  }
  revalidateAll();
}

export async function approveDeletionPM(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const req = await prisma.deletionRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PHASE_APPROVED" || !req.entityId) return;
  const entityId = req.entityId;

  const numId = Number(entityId);
  await prisma.$transaction(async (tx) => {
    switch (req.entityType) {
      case "SITE": await tx.site.delete({ where: { id: entityId } }); break;
      case "NOMINAL_POINT": await tx.nominalPoint.delete({ where: { id: entityId } }); break;
      case "RISK": await tx.risk.delete({ where: { id: numId } }); break;
      case "MAINTENANCE_TICKET": await tx.maintenanceTicket.delete({ where: { id: numId } }); break;
      case "PREVENTIVE": await tx.preventiveMaintenance.delete({ where: { id: numId } }); break;
      default: throw new Error("نوع غير معروف");
    }
    await tx.deletionRequest.update({
      where: { id },
      data: { status: "COMPLETED", pmApprovedAt: new Date(), deletedAt: new Date(), entityId: null },
    });
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "DELETE", actor: await actor(),
    entity: req.entityType, entityId, entityLabel: req.label,
    summary: `تنفيذ حذف ${req.entityType} بعد اعتماد مدير المشروع: ${req.label}`,
    before: { entityType: req.entityType, targetId: entityId, reason: req.reason } });
  revalidateAll();
}

export async function rejectDeletion(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;
  const res = await prisma.deletionRequest.updateMany({
    where: { id, status: { in: ["PENDING", "PHASE_APPROVED"] } },
    data: { status: "REJECTED", rejectedStage: stage, rejectedReason: reason },
  });
  if (res.count > 0) {
    const req = await prisma.deletionRequest.findUnique({ where: { id }, select: { label: true, entityType: true } });
    await logAudit({ category: AUDIT.DATA_CHANGE, action: "UPDATE", actor: await actor(),
      entity: "DeletionRequest", entityId: id, entityLabel: req?.label ?? id,
      summary: `رفض طلب حذف ${req?.entityType ?? ""}: ${req?.label ?? id}`, after: { rejectedStage: stage, rejectedReason: reason } });
  }
  revalidateAll();
}
