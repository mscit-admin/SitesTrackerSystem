import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { LanguagesManager } from "@/components/i18n/LanguagesManager";
import { ALL_MESSAGE_KEYS } from "@/lib/messages";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LanguagesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!can(me, "localization.view")) redirect("/");

  const [langs, counts] = await Promise.all([
    prisma.language.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.translation.groupBy({ by: ["languageCode"], _count: true }),
  ]);
  const countMap = new Map(counts.map((c) => [c.languageCode, c._count]));

  const data = langs.map((l) => ({
    code: l.code,
    name: l.name,
    abbreviation: l.abbreviation,
    direction: l.direction,
    isDefault: l.isDefault,
    isEnabled: l.isEnabled,
    translated: countMap.get(l.code) ?? 0,
  }));

  return (
    <div>
      <PageHeader title="اللغات والترجمة" subtitle="أضف لغات الواجهة وصدّر/استورد ملفات الترجمة (CSV)">
        <Link href="/settings" className="btn-ghost flex items-center gap-1.5">
          <ArrowRight size={16} /> الإعدادات
        </Link>
      </PageHeader>

      <LanguagesManager
        languages={data}
        totalKeys={ALL_MESSAGE_KEYS.length}
        canManage={can(me, "localization.languages")}
        canTranslate={can(me, "localization.translate")}
      />
    </div>
  );
}
