"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const name = (fd: FormData) => String(fd.get("name") ?? "").trim();

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
