import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { CatalogManager } from "@/components/CatalogManager";
import { PageSizeSetting } from "@/components/PageSizeSetting";
import { SecuritySettings } from "@/components/SecuritySettings";
import { getSitesPageSize } from "@/lib/queries";
import { getSecuritySettings } from "@/lib/settings";
import { getCurrentUser, can } from "@/lib/auth";
import { Languages, ChevronLeft } from "lucide-react";
import {
  addEquipmentType,
  removeEquipmentType,
  addManufacturer,
  removeManufacturer,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!can(me, "settings.view")) redirect("/");
  const canEdit = can(me, "settings.edit");

  const [types, makers, pageSize, security] = await Promise.all([
    prisma.equipmentType.findMany({ orderBy: { name: "asc" } }),
    prisma.manufacturer.findMany({ orderBy: { name: "asc" } }),
    getSitesPageSize(),
    getSecuritySettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="الإعدادات"
        subtitle="القوائم المرجعية المستخدمة في النظام — تُدار من هنا"
      />
      <div className="mb-6">
        <SecuritySettings current={security} canEdit={canEdit} />
      </div>
      {can(me, "localization.view") && (
        <div className="mb-6">
          <a href="/settings/languages" className="card flex items-center justify-between p-5 hover:bg-gray-50">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Languages size={16} className="text-brand" /> اللغات والترجمة
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">أضف لغات الواجهة وصدّر/استورد ملفات الترجمة (CSV).</p>
            </div>
            <ChevronLeft size={18} className="text-gray-400" />
          </a>
        </div>
      )}
      <div className="mb-6">
        <PageSizeSetting current={pageSize} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CatalogManager
          title="أنواع المعدات"
          hint="تظهر كخيارات عند تحديد معدات المرشّح في الاستحواذ."
          placeholder="مثال: MTS Cabinet، IP Router، هوائي RF…"
          items={types}
          addAction={addEquipmentType}
          removeAction={removeEquipmentType}
        />
        <CatalogManager
          title="الشركات المصنّعة"
          hint="تظهر كخيارات عند تحديد معدات المرشّح في الاستحواذ."
          placeholder="مثال: Cambium، Huawei، IPinfusion…"
          items={makers}
          addAction={addManufacturer}
          removeAction={removeManufacturer}
        />
      </div>
    </div>
  );
}
