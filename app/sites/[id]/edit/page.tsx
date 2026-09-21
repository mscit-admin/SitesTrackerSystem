import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteEditor } from "@/components/SiteEditor";
import { SECTIONS } from "@/lib/formSchema";

export const dynamic = "force-dynamic";

function safeParse(json: string | null): Record<string, any> {
  if (!json) return {};
  try {
    return JSON.parse(json) ?? {};
  } catch {
    return {};
  }
}

function buildValues(site: any, phaseData: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const section of SECTIONS) {
    for (const f of section.fields) {
      const parts = f.path.split(".");
      let v: any = undefined;
      if (parts[0] === "site") v = site[parts[1]];
      else if (parts[0] === "phase") v = phaseData[parts[1]]?.[parts[2]];
      out[f.path] = v == null ? "" : String(v);
    }
  }
  return out;
}

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) notFound();

  const phaseData = safeParse(site.phaseData);
  const values = buildValues(site, phaseData);

  return (
    <div>
      <div className="mb-5">
        <Link href={`/sites/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← رجوع لتفاصيل الموقع
        </Link>
        <h1 className="mt-2 flex items-center gap-3 text-xl font-semibold text-gray-900">
          <span className="font-mono text-brand">{site.siteId}</span>
          <span>{site.name ?? "—"}</span>
          <span className="text-sm font-normal text-gray-400">— إدخال / تعديل البيانات</span>
        </h1>
        <p className="mt-1 text-[13px] text-gray-500">
          اختر المرحلة من القائمة، أدخل البيانات، ثم اضغط «حفظ». تُحدَّث حالة المراحل ونسبة الإنجاز تلقائياً.
        </p>
      </div>

      <SiteEditor siteId={id} values={values} />
    </div>
  );
}
