"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTicket(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "") || null;
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportedBy = String(formData.get("reportedBy") ?? "").trim() || null;

  if (!siteId || !title) return;

  await prisma.maintenanceTicket.create({
    data: { siteId, title, category, priority, description, reportedBy },
  });
  revalidatePath("/maintenance");
  revalidatePath(`/sites/${siteId}`);
}

export async function resolveTicket(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.maintenanceTicket.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
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
  revalidatePath("/maintenance");
}
