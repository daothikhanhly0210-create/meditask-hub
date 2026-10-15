"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/components/i18n-provider";
import { createMeetingAction, updateMeetingAction } from "@/server/actions/meetings";
import { idleState } from "@/lib/action-state";
import type { MeetingFormValues, PersonOption } from "./types";

export function MeetingDialog({
  open,
  onClose,
  people,
  meeting,
}: {
  open: boolean;
  onClose: () => void;
  people: PersonOption[];
  meeting?: MeetingFormValues;
}) {
  const t = useTranslations();
  const isEdit = Boolean(meeting);
  const action = isEdit ? updateMeetingAction : createMeetingAction;
  const [state, formAction, pending] = useActionState(action, idleState);

  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(t(state.message ?? "messages.meetingCreated"));
      onClose();
    } else if (state.message) {
      toast.error(t(state.message));
    }
  }, [state, t, onClose]);

  const fieldError = (name: string) => {
    const error = state.fieldErrors?.[name]?.[0];
    return error ? t(error) : undefined;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? t("meetings.editMeeting") : t("meetings.newMeeting")}
      description={t("meetings.subtitle")}
      className="max-w-2xl"
    >
      <form action={formAction} className="space-y-4">
        {meeting ? <input type="hidden" name="meetingId" value={meeting.id} /> : null}

        <Field label={t("meetings.titleLabel")} required error={fieldError("title")}>
          <Input name="title" defaultValue={meeting?.title ?? ""} maxLength={200} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("meetings.dateLabel")} required error={fieldError("meetingDate")}>
            <Input
              name="meetingDate"
              type="date"
              defaultValue={meeting?.meetingDate ? meeting.meetingDate.slice(0, 10) : ""}
              required
            />
          </Field>
          <Field label={t("meetings.locationLabel")} hint={t("common.optional")}>
            <Input name="location" defaultValue={meeting?.location ?? ""} maxLength={200} />
          </Field>
          <Field label={t("meetings.chairLabel")} hint={t("common.optional")}>
            <Input name="chairName" defaultValue={meeting?.chairName ?? ""} maxLength={120} />
          </Field>
          <Field label={t("meetings.secretaryLabel")} hint={t("common.optional")}>
            <Input name="secretaryName" defaultValue={meeting?.secretaryName ?? ""} maxLength={120} />
          </Field>
        </div>

        <Field label={t("meetings.participantsLabel")} hint={t("meetings.participantsHint")}>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-input p-3">
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              people.map((person) => (
                <label key={person.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="participantIds"
                    value={person.id}
                    defaultChecked={meeting?.participantIds.includes(person.id) ?? false}
                    className="size-4 rounded border-input"
                  />
                  {person.name}
                </label>
              ))
            )}
          </div>
        </Field>

        <Field label={t("meetings.guestNamesLabel")} hint={t("meetings.guestNamesHint")}>
          <Textarea
            name="participantNames"
            rows={3}
            maxLength={2000}
            defaultValue={meeting?.participantNames ?? ""}
            placeholder={t("meetings.guestNamesPlaceholder")}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            <Save />
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
