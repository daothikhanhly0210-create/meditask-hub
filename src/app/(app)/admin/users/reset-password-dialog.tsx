"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/components/i18n-provider";
import { resetUserPasswordAction } from "@/server/actions/users";
import { idleState } from "@/lib/action-state";
import type { UserRow } from "./types";

export function ResetPasswordDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: UserRow | null;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(resetUserPasswordAction, idleState);

  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;

    if (state.ok) {
      toast.success(t(state.message ?? "messages.passwordReset"));
      onClose();
    } else if (state.message) {
      toast.error(t(state.message));
    }
  }, [state, t, onClose]);

  const error = state.fieldErrors?.password?.[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("admin.resetPassword")}
      description={t("admin.resetPasswordHint")}
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="userId" value={user?.id ?? ""} />
        <Field
          label={t("fields.newPassword")}
          htmlFor="reset-password"
          required
          hint={`${t("fields.fullName")}: ${user?.name ?? ""}`}
          error={error ? t(error) : undefined}
        >
          <Input
            id="reset-password"
            name="password"
            type="text"
            required
            minLength={8}
            autoComplete="off"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            <KeyRound />
            {pending ? t("common.saving") : t("admin.resetPasswordButton")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
