"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markNotificationsRead(): Promise<void> {
  const me = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: me.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function clearNotifications(): Promise<void> {
  const me = await requireUser();
  await prisma.notification.deleteMany({ where: { userId: me.id } });
  revalidatePath("/", "layout");
}
