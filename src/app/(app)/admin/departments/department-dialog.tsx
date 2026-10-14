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
import { createDepartmentAction, updateDepartmentAction } from "@/server/actions/departments";
import { idleState } from "@/lib/action-state";
import type { DepartmentRow, UserOption } from "./types";

export function DepartmentDialog({
  open,
  onClose,
  department,
  users,
}: {
  open: boolean;
  onClose: () => void;
  department?: DepartmentRow;
  users: UserOption[];
}) {
  const t = useTranslations();
  const isEdit = Boolean(department);
  const action = isEdit ? updateDepartmentAction : createDepartmentAction;
  const [state, formAction, pending] = useActionState(action, idleState);

  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;

    if (state.ok) {
      toast.success(t(state.message ?? "messages.departmentCreated"));
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
      title={isEdit ? t("admin.editDepartment") : t("admin.newDepartment")}
      description={t("admin.departmentsSubtitle")}
    >
      <form action={formAction} className="space-y-4">
        {isEdit ? <input type="hidden" name="departmentId" value={department!.id} /> : null}

        {state.message && !state.ok ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{t(state.message)}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.name")} htmlFor="name" required error={fieldError("name")}>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={department?.name ?? ""}
            />
          </Field>
          <Field
            label={`${t("fields.code")}`}
            htmlFor="code"
            required
            error={fieldError("code")}
            hint={t("admin.codeHint")}
          >
            <Input
              id="code"
              name="code"
              required
              maxLength={20}
              defaultValue={department?.code ?? ""}
              className="uppercase"
            />
          </Field>
        </div>

        <Field label={`${t("fields.name")} (EN)`} htmlFor="nameEn" error={fieldError("nameEn")}>
          <Input id="nameEn" name="nameEn" maxLength={120} defaultValue={department?.nameEn ?? ""} />
        </Field>

        <Field
          label={t("fields.head")}
          htmlFor="headId"
          error={fieldError("headId")}
          hint={t("admin.noHead")}
        >
          <Select id="headId" name="headId" defaultValue={department?.headId ?? ""}>
            <option value="">{t("admin.noHead")}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("fields.description")} htmlFor="description" error={fieldError("description")}>
          <Textarea
            id="description"
            name="description"
            maxLength={500}
            defaultValue={department?.description ?? ""}
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
