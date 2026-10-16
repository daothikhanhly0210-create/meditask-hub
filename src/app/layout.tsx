import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocale } from "@/i18n";

export const metadata: Metadata = {
  title: "MediTask Hub | Giao việc & Biên bản bệnh viện",
  description:
    "MediTask Hub (MTH) — hệ thống giao việc nội bộ cho bệnh viện: phiếu giao việc theo khoa/phòng, theo dõi tiến độ, biên bản cuộc họp và đầu việc.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
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
