"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/components/i18n-provider";
import { deleteDepartmentAction } from "@/server/actions/departments";
import type { ActionState } from "@/lib/action-state";
import { DepartmentDialog } from "./department-dialog";
import type { DepartmentRow, UserOption } from "./types";

type FormAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

export function DepartmentsClient({
  departments,
  users,
}: {
  departments: DepartmentRow[];
  users: UserOption[];
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | undefined>(undefined);

  const handleDelete = (department: DepartmentRow) => {
    if (!window.confirm(t("admin.deleteDepartmentConfirm", { name: department.name }))) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("departmentId", department.id);
      const action: FormAction = deleteDepartmentAction;
      const result = await action(undefined, formData);
      if (result.ok) {
        toast.success(t(result.message ?? "messages.departmentDeleted"));
      } else {
        toast.error(t(result.message ?? "messages.actionFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus />
          {t("admin.newDepartment")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.name")}</TableHead>
              <TableHead>{t("fields.code")}</TableHead>
              <TableHead>{t("fields.head")}</TableHead>
              <TableHead>{t("fields.members")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{department.name}</span>
                        {department.nameEn ? (
                          <span className="text-xs text-muted-foreground">{department.nameEn}</span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{department.code}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {department.headName ?? (
                      <span className="text-muted-foreground">{t("admin.noHead")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="size-3.5" />
                      {department.memberCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("common.edit")}
                        onClick={() => {
                          setEditing(department);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("common.delete")}
                        disabled={pending}
                        onClick={() => handleDelete(department)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {dialogOpen ? (
        <DepartmentDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          department={editing}
          users={users}
        />
      ) : null}
    </div>
  );
}
