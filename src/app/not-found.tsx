import Link from "next/link";
import { getTranslator } from "@/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const { t } = await getTranslator();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-semibold">{t("errors.notFound")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("errors.notFoundDesc")}</p>
      <Link href="/dashboard" className={cn(buttonVariants(), "mt-2")}>
        {t("errors.backHome")}
      </Link>
    </main>
  );
}
