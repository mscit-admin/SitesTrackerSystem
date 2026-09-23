import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AvatarUploader } from "@/components/auth/AvatarUploader";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="الملف الشخصي" subtitle={`${me.fullName} — ${me.employeeId}`} />
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <Info label="البريد" value={me.email} ltr />
        <Info label="الجوال" value={me.mobile ?? "—"} ltr />
        <Info label="الدور" value={me.roleName ?? "—"} />
        <Info label="المصادقة الثنائية" value={me.twoFactorEnabled ? "مفعّلة" : "غير مفعّلة"} />
      </div>
      <AvatarUploader current={me.avatarUrl} fullName={me.fullName} />
    </div>
  );
}

function Info({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className="mt-0.5 font-medium text-gray-800" dir={ltr ? "ltr" : undefined}>{value}</div>
    </div>
  );
}
