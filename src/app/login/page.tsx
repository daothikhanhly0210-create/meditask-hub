import { redirect } from "next/navigation";
import { getTranslator } from "@/i18n";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const { t } = await getTranslator();
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-sm font-bold tracking-tight text-primary-foreground">
            MTH
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("auth.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>
        </div>

        <LoginForm showDemo={showDemo} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("common.appName")}
        </p>
      </div>
    </main>
  );
}
