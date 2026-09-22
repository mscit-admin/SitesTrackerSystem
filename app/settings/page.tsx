import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { CatalogManager } from "@/components/CatalogManager";
import {
  addEquipmentType,
  removeEquipmentType,
  addManufacturer,
  removeManufacturer,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [types, makers] = await Promise.all([
    prisma.equipmentType.findMany({ orderBy: { name: "asc" } }),
    prisma.manufacturer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="الإعدادات"
        subtitle="القوائم المرجعية المستخدمة في النظام — تُدار من هنا"
      />
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
