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
import { createWorkOrderAction, updateWorkOrderAction } from "@/server/actions/tasks";
import { idleState } from "@/lib/action-state";
import { PRIORITIES } from "@/lib/tasks";
import type { DepartmentOption } from "./types";

export type WorkOrderFormValues = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  departmentIds: string[];
};

export function WorkOrderDialog({
  open,
  onClose,
  departments,
  workOrder,
}: {
  open: boolean;
  onClose: () => void;
  departments: DepartmentOption[];
  workOrder?: WorkOrderFormValues;
}) {
  const t = useTranslations();
  const isEdit = Boolean(workOrder);
  const action = isEdit ? updateWorkOrderAction : createWorkOrderAction;
  const [state, formAction, pending] = useActionState(action, idleState);


  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(t(state.message ?? "messages.workOrderCreated"));
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
      title={workOrder ? t("tasks.editWorkOrder") : t("tasks.newWorkOrder")}
      description={t("tasks.subtitle")}
      className="max-w-2xl"
    >
      <form action={formAction} className="space-y-4">
        {workOrder ? <input type="hidden" name="workOrderId" value={workOrder.id} /> : null}

        {state.message && !state.ok ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{t(state.message)}</AlertDescription>
          </Alert>
        ) : null}

        <Field label={t("tasks.titleLabel")} htmlFor="title" required error={fieldError("title")}>
          <Input id="title" name="title" required maxLength={200} defaultValue={workOrder?.title ?? ""} />
        </Field>

        <Field label={t("fields.description")} htmlFor="description" error={fieldError("description")}>
          <Textarea
            id="description"
            name="description"
            maxLength={2000}
            defaultValue={workOrder?.description ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("tasks.priorityLabel")} htmlFor="priority">
            <Select id="priority" name="priority" defaultValue={workOrder?.priority ?? "NORMAL"}>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {t(`tasks.priorities.${value}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("tasks.dueDateLabel")} htmlFor="dueDate" hint={t("common.optional")}>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={workOrder?.dueDate ? workOrder.dueDate.slice(0, 10) : ""}
            />
          </Field>
        </div>

        <Field label={t("tasks.targets")} required error={fieldError("departmentIds")}>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-input p-3">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              departments.map((department) => (
                <label key={department.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="departmentIds"
                    value={department.id}
                    defaultChecked={workOrder?.departmentIds.includes(department.id) ?? false}
                    className="size-4 rounded border-input"
                  />
                  {department.name}
                </label>
              ))
            )}
          </div>
        </Field>
        <p className="text-xs text-muted-foreground">{t("tasks.noHeadWarning")}</p>

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
