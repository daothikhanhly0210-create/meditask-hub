"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/components/i18n-provider";
import { saveMinuteAction } from "@/server/actions/meetings";
import { idleState } from "@/lib/action-state";
import type { MinuteView } from "../types";

export function MinuteEditor({
  meetingId,
  minute,
}: {
  meetingId: string;
  minute: MinuteView;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(saveMinuteAction, idleState);

  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) toast.success(t(state.message ?? "messages.minuteSaved"));
    else if (state.message) toast.error(t(state.message));
  }, [state, t]);

  const fieldError = (name: string) => {
    const error = state.fieldErrors?.[name]?.[0];
    return error ? t(error) : undefined;
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="meetingId" value={meetingId} />

      <Field label={t("meetings.summaryLabel")} hint={t("common.optional")}>
        <Input name="summary" defaultValue={minute?.summary ?? ""} maxLength={2000} />
      </Field>

      <Field
        label={t("meetings.contentLabel")}
        required
        error={fieldError("content")}
        hint={t("meetings.contentHint")}
      >
        <Textarea
          name="content"
          rows={14}
          defaultValue={minute?.content ?? ""}
          className="font-mono text-sm"
        />
      </Field>

      <Field label={t("meetings.decisionsLabel")} hint={t("common.optional")}>
        <Textarea name="decisions" rows={4} defaultValue={minute?.decisions ?? ""} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save />
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}

export function MinuteViewer({ minute }: { minute: MinuteView }) {
  const t = useTranslations();
  if (!minute) {
    return <p className="text-sm text-muted-foreground">{t("meetings.noMinute")}</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      {minute.summary ? (
        <div>
          <p className="font-medium">{t("meetings.summaryLabel")}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{minute.summary}</p>
        </div>
      ) : null}
      <div>
        <p className="font-medium">{t("meetings.contentLabel")}</p>
        <p className="whitespace-pre-wrap text-muted-foreground">{minute.content}</p>
      </div>
      {minute.decisions ? (
        <div>
          <p className="font-medium">{t("meetings.decisionsLabel")}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{minute.decisions}</p>
        </div>
      ) : null}
    </div>
  );
}
