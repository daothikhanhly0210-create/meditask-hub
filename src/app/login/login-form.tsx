"use client";

import { useActionState, useState } from "react";
import { AlertCircle, LogIn } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/components/i18n-provider";
import { loginAction } from "@/server/actions/auth";
import { idleState } from "@/lib/action-state";
import { DEMO_PASSWORD, demoAccounts } from "@/lib/demo-accounts";
import { asRole } from "@/lib/rbac";

export function LoginForm({ showDemo }: { showDemo: boolean }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(loginAction, idleState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card>
      <form action={formAction}>
        <CardHeader className="space-y-1">
          <h2 className="text-lg font-semibold leading-none">{t("auth.signIn")}</h2>
        </CardHeader>

        <CardContent className="space-y-4">
          {state.message && !state.ok ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{t(state.message)}</AlertDescription>
            </Alert>
          ) : null}

          <Field label={t("auth.email")} htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.local"
            />
          </Field>

          <Field label={t("auth.password")} htmlFor="password" required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            <LogIn />
            {pending ? t("auth.signingIn") : t("auth.signIn")}
          </Button>

          {showDemo ? (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("auth.demoAccounts")}
                </span>
                <span className="text-xs text-muted-foreground">{DEMO_PASSWORD}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("auth.demoHint")}</p>
              <div className="grid gap-1.5">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(DEMO_PASSWORD);
                    }}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Badge variant="secondary" className="shrink-0 border-0 bg-transparent p-0 text-muted-foreground">
                      {t(`roles.${asRole(account.role)}`)}
                    </Badge>
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {account.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}
