"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/components/i18n-provider";
import { changePasswordAction } from "@/server/actions/auth";
import { idleState } from "@/lib/action-state";

export function ChangePasswordForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(changePasswordAction, idleState);

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(t(state.message));
    } else if (!state.ok && state.message) {
      toast.error(t(state.message));
    }
  }, [state, t]);

  const fieldError = (name: string) => {
    const error = state.fieldErrors?.[name]?.[0];
    return error ? t(error) : undefined;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.changePassword")}</CardTitle>
        <CardDescription>{t("profile.security")}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <Field
            label={t("profile.currentPassword")}
            htmlFor="currentPassword"
            required
            error={fieldError("currentPassword")}
          >
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("profile.newPassword")}
              htmlFor="newPassword"
              required
              error={fieldError("newPassword")}
            >
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            <Field
              label={t("profile.confirmPassword")}
              htmlFor="confirmPassword"
              required
              error={fieldError("confirmPassword")}
            >
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <Button type="submit" disabled={pending}>
            <KeyRound />
            {pending ? t("common.saving") : t("profile.updatePassword")}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
