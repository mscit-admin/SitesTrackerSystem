import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام متابعة مواقع الاتصالات — GSDN",
  description:
    "نظام متابعة مواقع الاتصالات عبر مراحل التصميم والتجهيز والاختبار والإطلاق والتسليم والتشغيل والصيانة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 px-4 py-6 md:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
