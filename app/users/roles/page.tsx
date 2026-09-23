import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { RolesManager } from "@/components/users/RolesManager";
import { parsePerms } from "@/lib/permissions";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!can(me, "roles.view")) redirect("/");

  const roles = await prisma.role.findMany({
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });

  const data = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isAdmin: r.isAdmin,
    isSystem: r.isSystem,
    userCount: r._count.users,
    permissions: parsePerms(r.permissions),
  }));

  return (
    <div>
      <PageHeader title="الأدوار ومصفوفة الصلاحيات" subtitle="حدّد صلاحيات كل دور — من أصغر جزء إلى أكبره">
        <Link href="/users" className="btn-ghost flex items-center gap-1.5">
          <ArrowRight size={16} /> المستخدمون
        </Link>
      </PageHeader>

      <RolesManager
        roles={data}
        canCreate={can(me, "roles.create")}
        canEdit={can(me, "roles.edit")}
        canDelete={can(me, "roles.delete")}
      />
    </div>
  );
}
