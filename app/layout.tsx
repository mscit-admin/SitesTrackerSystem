import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { getSecuritySettings } from "@/lib/settings";
import { getI18n, getEnabledLanguages } from "@/lib/i18n";
import { sweepAccountExpiry } from "@/lib/accountExpiry";
import { prisma } from "@/lib/prisma";
import { AuthProvider, type ClientUser } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/auth/AppShell";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "نظام متابعة مواقع الاتصالات — GSDN",
  description:
    "نظام متابعة مواقع الاتصالات عبر مراحل التصميم والتجهيز والاختبار والإطلاق والتسليم والتشغيل والصيانة",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Periodically disable expired accounts + queue expiry notices (throttled).
  await sweepAccountExpiry().catch(() => {});

  const [u, security, i18n, enabledLangs] = await Promise.all([
    getCurrentUser(), getSecuritySettings(), getI18n(), getEnabledLanguages(),
  ]);
  const langOptions = enabledLangs.map((l) => ({ code: l.code, name: l.name, abbreviation: l.abbreviation }));

  const notifications = u
    ? (await prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 20 })).map((n) => ({
        id: n.id, type: n.type, title: n.title, body: n.body, createdAt: n.createdAt.toISOString(), read: !!n.readAt,
      }))
    : [];

  // Central auth guard: a request that reached here with no valid user but on a
  // protected path has a stale/expired cookie — send it through /logout (which
  // clears the cookie) to the login screen. Prevents the "empty chrome" state.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!u && pathname && pathname !== "/login" && pathname !== "/logout") {
    redirect("/logout");
  }
  // Force a password change (new users, and after an admin reset) before the
  // user can use anything else.
  if (u && u.mustChangePassword && pathname !== "/account/password" && pathname !== "/logout") {
    redirect("/account/password");
  }

  const clientUser: ClientUser | null = u
    ? {
        id: u.id,
        fullName: u.fullName,
        employeeId: u.employeeId,
        email: u.email,
        avatarUrl: u.avatarUrl,
        roleName: u.roleName,
        isAdmin: u.isAdmin,
        permissions: u.permissions,
        twoFactorEnabled: u.twoFactorEnabled,
        mustChangePassword: u.mustChangePassword,
      }
    : null;

  return (
    <html lang={i18n.locale} dir={i18n.dir}>
      <head>
        {/* Cairo loaded at runtime (not build time) so builds work offline.
            Falls back gracefully to Tahoma/Segoe UI if the network is blocked. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased text-gray-900">
        <LocaleProvider value={{ locale: i18n.locale, dir: i18n.dir, messages: i18n.messages, languages: langOptions }}>
          <AuthProvider user={clientUser}>
            <AppShell idleMinutes={security.idleMinutes} notifications={notifications}>{children}</AppShell>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
