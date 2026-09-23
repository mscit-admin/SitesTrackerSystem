"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requirePermission, requireUser } from "@/lib/auth";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

type Res = { ok: boolean; error?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function revalidate() {
  revalidatePath("/users");
  revalidatePath("/users/roles");
}

// ---------------- Users ----------------
export async function createUser(fd: FormData): Promise<Res> {
  await requirePermission("users.create");
  const firstName = str(fd, "firstName");
  const lastName = str(fd, "lastName");
  const employeeId = str(fd, "employeeId");
  const email = str(fd, "email").toLowerCase();
  const mobile = str(fd, "mobile") || null;
  const roleId = str(fd, "roleId") || null;
  const password = str(fd, "password");

  if (!firstName || !lastName) return { ok: false, error: "الاسم الأول والأخير مطلوبان" };
  if (!employeeId) return { ok: false, error: "الرقم الوظيفي مطلوب" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "بريد إلكتروني غير صالح" };
  if (password.length < 8) return { ok: false, error: "كلمة المرور 8 أحرف على الأقل" };

  const dup = await prisma.user.findFirst({ where: { OR: [{ email }, { employeeId }] }, select: { id: true } });
  if (dup) return { ok: false, error: "البريد أو الرقم الوظيفي مستخدم مسبقاً" };

  await prisma.user.create({
    data: {
      firstName, lastName, employeeId, email, mobile, roleId,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      isActive: true,
    },
  });
  revalidate();
  return { ok: true };
}

export async function updateUser(fd: FormData): Promise<Res> {
  await requirePermission("users.edit");
  const id = str(fd, "id");
  if (!id) return { ok: false, error: "مستخدم غير معروف" };
  const firstName = str(fd, "firstName");
  const lastName = str(fd, "lastName");
  const employeeId = str(fd, "employeeId");
  const email = str(fd, "email").toLowerCase();
  const mobile = str(fd, "mobile") || null;
  const roleId = str(fd, "roleId") || null;
  if (!firstName || !lastName || !employeeId || !/^\S+@\S+\.\S+$/.test(email))
    return { ok: false, error: "بيانات غير مكتملة" };

  const dup = await prisma.user.findFirst({
    where: { OR: [{ email }, { employeeId }], NOT: { id } }, select: { id: true },
  });
  if (dup) return { ok: false, error: "البريد أو الرقم الوظيفي مستخدم لمستخدم آخر" };

  await prisma.user.update({ where: { id }, data: { firstName, lastName, employeeId, email, mobile, roleId } });
  revalidate();
  return { ok: true };
}

export async function setUserActive(fd: FormData): Promise<Res> {
  const me = await requirePermission("users.deactivate");
  const id = str(fd, "id");
  const active = str(fd, "active") === "1";
  if (id === me.id && !active) return { ok: false, error: "لا يمكنك تعطيل حسابك" };
  await prisma.user.update({ where: { id }, data: { isActive: active } });
  if (!active) await prisma.session.deleteMany({ where: { userId: id } }); // force logout
  revalidate();
  return { ok: true };
}

export async function resetUserPassword(fd: FormData): Promise<Res> {
  await requirePermission("users.resetPassword");
  const id = str(fd, "id");
  const password = str(fd, "password");
  if (password.length < 8) return { ok: false, error: "كلمة المرور 8 أحرف على الأقل" };
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  await prisma.session.deleteMany({ where: { userId: id } });
  revalidate();
  return { ok: true };
}

export async function disableUser2fa(fd: FormData): Promise<Res> {
  await requirePermission("users.edit");
  const id = str(fd, "id");
  await prisma.user.update({ where: { id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  revalidate();
  return { ok: true };
}

// ---------------- Roles ----------------
export async function createRole(fd: FormData): Promise<Res> {
  await requirePermission("roles.create");
  const name = str(fd, "name");
  const description = str(fd, "description") || null;
  if (!name) return { ok: false, error: "اسم الدور مطلوب" };
  const dup = await prisma.role.findUnique({ where: { name }, select: { id: true } });
  if (dup) return { ok: false, error: "اسم الدور مستخدم مسبقاً" };
  await prisma.role.create({ data: { name, description, permissions: "[]" } });
  revalidate();
  return { ok: true };
}

export async function saveRolePermissions(fd: FormData): Promise<Res> {
  await requirePermission("roles.edit");
  const id = str(fd, "id");
  const keys = fd.getAll("perm").map(String).filter((k) => ALL_PERMISSION_KEYS.includes(k));
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return { ok: false, error: "الدور غير موجود" };
  if (role.isAdmin) return { ok: false, error: "دور المدير يملك كل الصلاحيات ولا يُعدّل" };
  await prisma.role.update({ where: { id }, data: { permissions: JSON.stringify(keys) } });
  revalidate();
  return { ok: true };
}

export async function deleteRole(fd: FormData): Promise<Res> {
  await requirePermission("roles.delete");
  const id = str(fd, "id");
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) return { ok: false, error: "الدور غير موجود" };
  if (role.isSystem) return { ok: false, error: "لا يمكن حذف دور نظام" };
  if (role._count.users > 0) return { ok: false, error: "لا يمكن حذف دور مُسند لمستخدمين" };
  await prisma.role.delete({ where: { id } });
  revalidate();
  return { ok: true };
}
