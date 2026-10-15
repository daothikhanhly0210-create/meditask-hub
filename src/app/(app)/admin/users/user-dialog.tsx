"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertCircle, Save } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "@/components/i18n-provider";
import { createUserAction, updateUserAction } from "@/server/actions/users";
import { idleState } from "@/lib/action-state";
import { ROLES } from "@/lib/rbac";
import type { DepartmentOption, UserRow } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  departments: DepartmentOption[];
  user?: UserRow;
};

export function UserDialog({ open, onClose, departments, user }: Props) {
  const t = useTranslations();
  const isEdit = Boolean(user);
  const action = isEdit ? updateUserAction : createUserAction;
  const [state, formAction, pending] = useActionState(action, idleState);

  // React to each action result exactly once, even if the parent re-renders
  // (and therefore hands us a new `onClose` identity).
  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;

    if (state.ok) {
      toast.success(t(state.message ?? "messages.userUpdated"));
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
      title={isEdit ? t("admin.editUser") : t("admin.newUser")}
      description={isEdit ? user?.email : t("admin.usersSubtitle")}
    >
      <form action={formAction} className="space-y-4">
        {isEdit ? <input type="hidden" name="userId" value={user!.id} /> : null}

        {state.message && !state.ok ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{t(state.message)}</AlertDescription>
          </Alert>
        ) : null}

        <Field label={t("fields.fullName")} htmlFor="name" required error={fieldError("name")}>
          <Input id="name" name="name" required defaultValue={user?.name ?? ""} maxLength={120} />
        </Field>

        <Field label={t("fields.email")} htmlFor="email" required error={fieldError("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={user?.email ?? ""}
            autoComplete="off"
          />
        </Field>

        {!isEdit ? (
          <Field
            label={t("fields.password")}
            htmlFor="password"
            required
            error={fieldError("password")}
            hint={t("profile.passwordTooShort")}
          >
            <Input id="password" name="password" type="text" required minLength={8} />
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.role")} htmlFor="role" required error={fieldError("role")}>
            <Select id="role" name="role" defaultValue={user?.role ?? "STAFF"}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t("fields.department")}
            htmlFor="departmentId"
            error={fieldError("departmentId")}
          >
            <Select id="departmentId" name="departmentId" defaultValue={user?.departmentId ?? ""}>
              <option value="">{t("admin.noDepartment")}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.jobTitle")} htmlFor="jobTitle" error={fieldError("jobTitle")}>
            <Input id="jobTitle" name="jobTitle" defaultValue={user?.jobTitle ?? ""} maxLength={120} />
          </Field>

          <Field label={t("fields.phone")} htmlFor="phone" error={fieldError("phone")}>
            <Input id="phone" name="phone" defaultValue={user?.phone ?? ""} maxLength={30} />
          </Field>
        </div>

        {isEdit ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user?.isActive ?? true}
              className="size-4 rounded border-input"
            />
            {t("common.active")}
          </label>
        ) : null}

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
