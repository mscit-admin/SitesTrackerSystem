"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { setSecuritySettings, type SecuritySettings } from "@/lib/settings";

const name = (fd: FormData) => String(fd.get("name") ?? "").trim();

export async function saveSecuritySettings(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("settings.edit");
  const num = (k: string) => parseInt(String(fd.get(k) ?? ""), 10);
  const values: Partial<SecuritySettings> = {
    idleMinutes: num("idleMinutes"),
    absoluteDays: num("absoluteDays"),
    maxFailures: num("maxFailures"),
    lockMinutes: num("lockMinutes"),
  };
  await setSecuritySettings(values);
  revalidatePath("/settings");
  return { ok: true };
}

function done() {
  revalidatePath("/settings");
  revalidatePath("/acquisition");
}

export async function addEquipmentType(fd: FormData) {
  const n = name(fd);
  if (!n) return { ok: false, error: "الاسم مطلوب" };
  const exists = await prisma.equipmentType.findUnique({ where: { name: n } });
  if (exists) return { ok: false, error: "موجود مسبقاً" };
  await prisma.equipmentType.create({ data: { name: n } });
  done();
  return { ok: true };
}

export async function removeEquipmentType(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  if (id) await prisma.equipmentType.delete({ where: { id } });
  done();
}

export async function addManufacturer(fd: FormData) {
  const n = name(fd);
  if (!n) return { ok: false, error: "الاسم مطلوب" };
  const exists = await prisma.manufacturer.findUnique({ where: { name: n } });
  if (exists) return { ok: false, error: "موجود مسبقاً" };
  await prisma.manufacturer.create({ data: { name: n } });
  done();
  return { ok: true };
}

export async function removeManufacturer(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  if (id) await prisma.manufacturer.delete({ where: { id } });
  done();
}

export async function setSitesPageSize(fd: FormData) {
  const value = String(fd.get("value") ?? "").trim();
  if (!["10", "15", "25"].includes(value)) return { ok: false, error: "قيمة غير صالحة" };
  await prisma.appSetting.upsert({
    where: { key: "sitesPageSize" },
    update: { value },
    create: { key: "sitesPageSize", value },
  });
  revalidatePath("/settings");
  revalidatePath("/sites");
  return { ok: true };
}
