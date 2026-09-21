import Link from "next/link";
import { SectionForm } from "@/components/SectionForm";
import { SECTION_BY_ID } from "@/lib/formSchema";
import { createSite } from "@/app/sites/actions";

export const dynamic = "force-dynamic";

export default function NewSitePage() {
  const section = SECTION_BY_ID["site-info"];
  return (
    <div>
      <div className="mb-5">
        <Link href="/sites" className="text-sm text-gray-400 hover:text-gray-600">← رجوع للمواقع</Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">إضافة موقع جديد</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          أدخل معلومات الموقع الأساسية. بعد الإنشاء تُفتح شاشة إدخال بيانات المراحل لإكمال باقي البيانات.
        </p>
      </div>

      <div className="max-w-3xl">
        <SectionForm
          siteId="new"
          section={section}
          values={{}}
          mode="create"
          action={createSite}
          submitLabel="إنشاء الموقع"
        />
      </div>
    </div>
  );
}
