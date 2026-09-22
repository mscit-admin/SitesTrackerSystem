import Link from "next/link";
import { NominalPointForm } from "@/components/NominalPointForm";

export const dynamic = "force-dynamic";

export default function NewNominalPointPage() {
  return (
    <div>
      <div className="mb-5">
        <Link href="/acquisition" className="text-sm text-gray-400 hover:text-gray-600">← رجوع للاستحواذ</Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">نقطة اسمية جديدة</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          يحدّدها المنفّذ (AT Globe): مرجع + إحداثيات + المنطقة. ثم يبحث المالك عن مرشّحين لها.
        </p>
      </div>
      <NominalPointForm />
    </div>
  );
}
