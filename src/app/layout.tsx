import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocale } from "@/i18n";

export const metadata: Metadata = {
  title: "Hệ thống Giao việc Y tế | Medical Task Management",
  description:
    "Hệ thống giao việc nội bộ: ghi âm cuộc họp, biên bản, phân công và theo dõi tiến độ công việc theo khoa/phòng.",
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
