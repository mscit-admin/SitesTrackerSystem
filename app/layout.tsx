import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { getSecuritySettings } from "@/lib/settings";
import { AuthProvider, type ClientUser } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/auth/AppShell";

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
  const [u, security] = await Promise.all([getCurrentUser(), getSecuritySettings()]);

  // Central auth guard: a request that reached here with no valid user but on a
  // protected path has a stale/expired cookie — send it through /logout (which
  // clears the cookie) to the login screen. Prevents the "empty chrome" state.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!u && pathname && pathname !== "/login" && pathname !== "/logout") {
    redirect("/logout");
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
      }
    : null;

  return (
    <html lang="ar" dir="rtl">
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
        <AuthProvider user={clientUser}>
          <AppShell idleMinutes={security.idleMinutes}>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
