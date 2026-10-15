"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/components/i18n-provider";
import { saveActionItemAction } from "@/server/actions/meetings";
import { idleState } from "@/lib/action-state";
import type { ActionItemView, DepartmentOption, PersonOption } from "../types";

export function ActionItemDialog({
  open,
  onClose,
  meetingId,
  departments,
  people,
  item,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  departments: DepartmentOption[];
  people: PersonOption[];
  item?: ActionItemView;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(saveActionItemAction, idleState);
  const [departmentId, setDepartmentId] = useState(item?.departmentId ?? "");

  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(t(state.message ?? "messages.actionItemCreated"));
      onClose();
    } else if (state.message) {
      toast.error(t(state.message));
    }
  }, [state, t, onClose]);

  const fieldError = (name: string) => {
    const error = state.fieldErrors?.[name]?.[0];
    return error ? t(error) : undefined;
  };

  const assigneeOptions = departmentId
    ? people.filter((person) => person.departmentId === departmentId)
    : people;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? t("meetings.editActionItem") : t("meetings.newActionItem")}
      className="max-w-xl"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="meetingId" value={meetingId} />
        {item ? <input type="hidden" name="actionItemId" value={item.id} /> : null}

        <Field label={t("meetings.actionItemLabel")} required error={fieldError("title")}>
          <Input name="title" defaultValue={item?.title ?? ""} maxLength={200} required />
        </Field>

        <Field label={t("fields.description")} hint={t("common.optional")}>
          <Textarea name="description" defaultValue={item?.description ?? ""} maxLength={2000} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.department")} hint={t("common.optional")}>
            <Select
              name="departmentId"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">{t("meetings.noDepartment")}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("meetings.assigneeLabel")} hint={t("common.optional")}>
            <Select name="assigneeId" defaultValue={item?.assigneeId ?? ""}>
              <option value="">{t("tasks.notAssigned")}</option>
              {assigneeOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t("tasks.dueDateLabel")} hint={t("common.optional")}>
          <Input
            name="dueDate"
            type="date"
            defaultValue={item?.dueDate ? item.dueDate.slice(0, 10) : ""}
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
