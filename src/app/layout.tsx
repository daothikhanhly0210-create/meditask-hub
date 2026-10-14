import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocale } from "@/i18n";

export const metadata: Metadata = {
  title: "HRMS Nội bộ | Internal HR & Task Management",
  description:
    "Hệ thống quản lý nhân sự, ghi âm cuộc họp, biên bản và phân công công việc nội bộ.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </I18nProvider>
      </body>
    </html>
  );
}
