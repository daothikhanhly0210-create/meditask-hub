import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Header } from "@/components/app-shell/header";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const { t } = await getTranslator();

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="flex min-h-dvh w-full min-w-0 flex-col">
        <Header
          name={user.name}
          email={user.email}
          roleLabel={t(`roles.${user.role}`)}
          departmentName={user.departmentName}
        />
        <main className="flex-1 bg-muted/30 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
