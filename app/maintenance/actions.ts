"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, AUDIT } from "@/lib/audit";

const actor = () => getCurrentUser();

export async function createTicket(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "") || null;
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportedBy = String(formData.get("reportedBy") ?? "").trim() || null;

  if (!siteId || !title) return;

  const t = await prisma.maintenanceTicket.create({
    data: { siteId, title, category, priority, description, reportedBy },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "CREATE", actor: await actor(),
    entity: "MaintenanceTicket", entityId: String(t.id), entityLabel: title,
    summary: `تسجيل بلاغ صيانة: ${title}`, after: { siteId, title, priority, category } });
  revalidatePath("/maintenance");
  revalidatePath(`/sites/${siteId}`);
}

export async function resolveTicket(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const t = await prisma.maintenanceTicket.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
    select: { title: true },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "UPDATE", actor: await actor(),
    entity: "MaintenanceTicket", entityId: String(id), entityLabel: t.title, summary: `حل بلاغ صيانة: ${t.title}` });
  revalidatePath("/maintenance");
}

export async function completePreventive(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const task = await prisma.preventiveMaintenance.findUnique({ where: { id } });
  if (!task) return;
  const now = new Date();
  const next = new Date(now.getTime() + task.frequencyDays * 86400000);
  await prisma.preventiveMaintenance.update({
    where: { id },
    data: { lastDoneAt: now, nextDueAt: next, status: "SCHEDULED" },
  });
  await logAudit({ category: AUDIT.DATA_CHANGE, action: "UPDATE", actor: await actor(),
    entity: "PreventiveMaintenance", entityId: String(id), entityLabel: task.taskType,
    summary: `إنجاز مهمة صيانة دورية: ${task.taskType}`, after: { lastDoneAt: now, nextDueAt: next } });
  revalidatePath("/maintenance");
}
