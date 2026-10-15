"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertCircle, Save } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "@/components/i18n-provider";
import { createSubTaskAction, updateSubTaskAction } from "@/server/actions/tasks";
import { idleState } from "@/lib/action-state";
import { PRIORITIES } from "@/lib/tasks";
import type { SubTaskItem } from "../types";

export function SubTaskDialog({
  open,
  onClose,
  targetId,
  departmentName,
  members,
  subTask,
}: {
  open: boolean;
  onClose: () => void;
  targetId: string;
  departmentName: string;
  members: { id: string; name: string }[];
  subTask?: SubTaskItem;
}) {
  const t = useTranslations();
  const isEdit = Boolean(subTask);
  const action = isEdit ? updateSubTaskAction : createSubTaskAction;
  const [state, formAction, pending] = useActionState(action, idleState);

  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(t(state.message ?? "messages.subTaskCreated"));
      onClose();
    } else if (state.message) {
      toast.error(t(state.message));
    }
  }, [state, t, onClose]);

  const fieldError = (name: string) => {
    const error = state.fieldErrors?.[name]?.[0];
    return error ? t(error) : undefined;
  };

  const collaboratorIds = subTask?.collaborators.map((collaborator) => collaborator.id) ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? t("tasks.editSubTask") : t("tasks.newSubTask")}
      description={departmentName}
      className="max-w-2xl"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="targetId" value={targetId} />
        {subTask ? <input type="hidden" name="subTaskId" value={subTask.id} /> : null}

        {state.message && !state.ok ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{t(state.message)}</AlertDescription>
          </Alert>
        ) : null}

        <Field label={t("tasks.titleLabel")} htmlFor="subTaskTitle" required error={fieldError("title")}>
          <Input
            id="subTaskTitle"
            name="title"
            required
            maxLength={200}
            defaultValue={subTask?.title ?? ""}
          />
        </Field>

        <Field label={t("fields.description")} htmlFor="subTaskDescription">
          <Textarea
            id="subTaskDescription"
            name="description"
            maxLength={2000}
            defaultValue={subTask?.description ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("tasks.priorityLabel")} htmlFor="subTaskPriority">
            <Select id="subTaskPriority" name="priority" defaultValue={subTask?.priority ?? "NORMAL"}>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {t(`tasks.priorities.${value}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("tasks.dueDateLabel")} htmlFor="subTaskDue" hint={t("common.optional")}>
            <Input
              id="subTaskDue"
              name="dueDate"
              type="date"
              defaultValue={subTask?.dueDate ? subTask.dueDate.slice(0, 10) : ""}
            />
          </Field>
        </div>

        <Field label={t("tasks.mainAssignee")} htmlFor="mainAssigneeId">
          <Select id="mainAssigneeId" name="mainAssigneeId" defaultValue={subTask?.mainAssignee?.id ?? ""}>
            <option value="">{t("common.none")}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("tasks.collaborators")}>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-input p-3">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              members.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="collaboratorIds"
                    value={member.id}
                    defaultChecked={collaboratorIds.includes(member.id)}
                    className="size-4 rounded border-input"
                  />
                  {member.name}
                </label>
              ))
            )}
          </div>
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
