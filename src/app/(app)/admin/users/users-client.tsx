"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Lock, LockOpen, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/components/i18n-provider";
import {
  deleteUserAction,
  toggleUserActiveAction,
} from "@/server/actions/users";
import type { ActionState } from "@/lib/action-state";
import { ROLES, type Role } from "@/lib/rbac";
import { cn, formatDateTime } from "@/lib/utils";
import { UserDialog } from "./user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import type { DepartmentOption, UserRow } from "./types";

type FormAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

async function runAction(action: FormAction, values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return action(undefined, formData);
}

export function UsersClient({
  users,
  departments,
  currentUserId,
  locale,
}: {
  users: UserRow[];
  departments: DepartmentOption[];
  currentUserId: string;
  locale: string;
}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [pending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | undefined>(undefined);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (departmentFilter !== "ALL" && user.departmentId !== departmentFilter) return false;
      if (!query) return true;
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.jobTitle ?? "").toLowerCase().includes(query)
      );
    });
  }, [users, search, roleFilter, departmentFilter]);

  const handleDelete = (user: UserRow) => {
    if (!window.confirm(t("admin.deleteUserConfirm", { name: user.name }))) return;
    startTransition(async () => {
      const result = await runAction(deleteUserAction, { userId: user.id });
      if (result.ok) {
        toast.success(t(result.message ?? "messages.userDeleted"));
      } else {
        toast.error(t(result.message ?? "messages.actionFailed"));
      }
    });
  };

  const handleToggleActive = (user: UserRow) => {
    startTransition(async () => {
      const result = await runAction(toggleUserActiveAction, {
        userId: user.id,
        nextActive: String(!user.isActive),
      });
      if (result.ok) {
        toast.success(t(result.message ?? "messages.userUpdated"));
      } else {
        toast.error(t(result.message ?? "messages.actionFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as Role | "ALL")}
          className="w-44"
          aria-label={t("admin.filterByRole")}
        >
          <option value="ALL">{t("admin.allRoles")}</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </Select>

        <Select
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
          className="w-48"
          aria-label={t("admin.filterByDepartment")}
        >
          <option value="ALL">{t("admin.allDepartments")}</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>

        <Button
          onClick={() => {
            setEditingUser(undefined);
            setDialogOpen(true);
          }}
        >
          <UserPlus />
          {t("admin.newUser")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.fullName")}</TableHead>
              <TableHead>{t("fields.role")}</TableHead>
              <TableHead>{t("fields.department")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead>{t("fields.lastLogin")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`roles.${user.role}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.departmentName ?? t("common.none")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "success" : "outline"}>
                      {user.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(user.lastLoginAt, locale)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("common.edit")}
                        onClick={() => {
                          setEditingUser(user);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("admin.resetPassword")}
                        onClick={() => setResetUser(user)}
                      >
                        <KeyRound />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={user.isActive ? t("admin.lockAccount") : t("admin.unlockAccount")}
                        disabled={pending || user.id === currentUserId}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.isActive ? (
                          <Lock className="text-warning" />
                        ) : (
                          <LockOpen className="text-success" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("common.delete")}
                        disabled={pending || user.id === currentUserId}
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className={cn("text-destructive")} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("common.total")}: {filtered.length} / {users.length}
      </p>

      {dialogOpen ? (
        <UserDialog
          key={editingUser?.id ?? "new"}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          departments={departments}
          user={editingUser}
        />
      ) : null}

      <ResetPasswordDialog
        key={resetUser?.id ?? "reset-none"}
        open={resetUser !== null}
        onClose={() => setResetUser(null)}
        user={resetUser}
      />
    </div>
  );
}
