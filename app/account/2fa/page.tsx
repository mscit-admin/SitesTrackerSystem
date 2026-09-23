import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";

export const dynamic = "force-dynamic";

export default async function TwoFactorPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="المصادقة الثنائية (2FA)" subtitle="طبقة حماية إضافية عبر تطبيق مصادقة" />
      <TwoFactorSetup enabled={me.twoFactorEnabled} />
    </div>
  );
}
