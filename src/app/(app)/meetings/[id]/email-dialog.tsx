"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/components/i18n-provider";
import { emailMinuteAction } from "@/server/actions/meetings";
import { idleState } from "@/lib/action-state";
import type { Locale } from "@/i18n/config";

export function EmailDialog({
  open,
  onClose,
  meetingId,
  defaultRecipients,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  defaultRecipients: string;
  locale: Locale;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(emailMinuteAction, idleState);

  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(t(state.message ?? "messages.minuteEmailed"));
      onClose();
    } else if (state.message) {
      toast.error(t(state.message));
    }
  }, [state, t, onClose]);

  const fieldError = state.fieldErrors?.recipients?.[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("meetings.emailTitle")}
      description={t("meetings.emailHint")}
      className="max-w-xl"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="meetingId" value={meetingId} />
        <input type="hidden" name="locale" value={locale} />

        <Field
          label={t("meetings.emailRecipients")}
          required
          error={fieldError ? t(fieldError) : undefined}
          hint={t("meetings.emailRecipientsHint")}
        >
          <Textarea name="recipients" rows={4} defaultValue={defaultRecipients} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            <Send />
            {pending ? t("common.saving") : t("meetings.sendEmail")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
