import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UsersManager } from "@/components/users/UsersManager";
import { ShieldHalf } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!can(me, "users.view")) redirect("/");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { role: { select: { name: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const rows = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    employeeId: u.employeeId,
    email: u.email,
    mobile: u.mobile,
    avatarUrl: u.avatarUrl,
    roleId: u.roleId,
    roleName: u.role?.name ?? null,
    isActive: u.isActive,
    twoFactorEnabled: u.twoFactorEnabled,
    validFrom: iso(u.validFrom),
    validTo: iso(u.validTo),
  }));

  return (
    <div>
      <PageHeader title="المستخدمون والصلاحيات" subtitle={`${users.length} مستخدم`}>
        {can(me, "roles.view") && (
          <Link href="/users/roles" className="btn-ghost flex items-center gap-1.5">
            <ShieldHalf size={16} /> الأدوار ومصفوفة الصلاحيات
          </Link>
        )}
      </PageHeader>

      <UsersManager
        users={rows}
        roles={roles}
        meId={me.id}
        canCreate={can(me, "users.create")}
        canEdit={can(me, "users.edit")}
        canDeactivate={can(me, "users.deactivate")}
        canReset={can(me, "users.resetPassword")}
      />
    </div>
  );
}
