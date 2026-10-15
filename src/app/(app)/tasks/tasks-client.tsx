"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/components/i18n-provider";
import { isOverdue, PRIORITIES, WORK_ORDER_STATUSES } from "@/lib/tasks";
import { formatDate } from "@/lib/utils";
import { WorkOrderDialog } from "./work-order-dialog";
import type { DepartmentOption, WorkOrderListItem } from "./types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "outline" | "destructive"> = {
  OPEN: "secondary",
  IN_PROGRESS: "warning",
  DONE: "success",
  CANCELLED: "outline",
};

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "outline" | "destructive"> = {
  LOW: "outline",
  NORMAL: "secondary",
  HIGH: "warning",
  URGENT: "destructive",
};

export function TasksClient({
  workOrders,
  departments,
  canCreate,
  locale,
}: {
  workOrders: WorkOrderListItem[];
  departments: DepartmentOption[];
  canCreate: boolean;
  locale: string;
}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [priority, setPriority] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workOrders.filter((workOrder) => {
      if (status !== "ALL" && workOrder.status !== status) return false;
      if (priority !== "ALL" && workOrder.priority !== priority) return false;
      if (!query) return true;
      return (
        workOrder.title.toLowerCase().includes(query) ||
        workOrder.code.toLowerCase().includes(query)
      );
    });
  }, [workOrders, search, status, priority]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("tasks.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("tasks.subtitle")}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            {t("tasks.newWorkOrder")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("tasks.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-44"
          aria-label={t("fields.status")}
        >
          <option value="ALL">{t("tasks.allStatuses")}</option>
          {WORK_ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`tasks.statuses.${value}`)}
            </option>
          ))}
        </Select>
        <Select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="w-44"
          aria-label={t("tasks.priorityLabel")}
        >
          <option value="ALL">{t("tasks.allPriorities")}</option>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {t(`tasks.priorities.${value}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tasks.codeLabel")}</TableHead>
              <TableHead>{t("tasks.titleLabel")}</TableHead>
              <TableHead>{t("tasks.progressLabel")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead>{t("fields.createdAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-2 size-6" />
                  {t("tasks.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((workOrder) => {
                const overdue = isOverdue(workOrder.dueDate, workOrder.status === "DONE");
                return (
                  <TableRow key={workOrder.id}>
                    <TableCell className="font-mono text-xs">{workOrder.code}</TableCell>
                    <TableCell className="max-w-80">
                      <Link
                        href={`/tasks/${workOrder.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {workOrder.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant={PRIORITY_VARIANT[workOrder.priority] ?? "secondary"}>
                          {t(`tasks.priorities.${workOrder.priority}`)}
                        </Badge>
                        {workOrder.departmentNames.map((name) => (
                          <span
                            key={name}
                            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="w-40">
                      <Progress value={workOrder.progress} />
                      <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                        {workOrder.progress}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[workOrder.status] ?? "secondary"}>
                        {t(`tasks.statuses.${workOrder.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className={overdue ? "font-medium text-destructive" : undefined}>
                        {formatDate(workOrder.dueDate, locale)}
                        {overdue ? ` · ${t("tasks.overdue")}` : ""}
                      </span>
                      <span className="mt-1 block">{workOrder.createdByName}</span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("common.total")}: {filtered.length} / {workOrders.length}
      </p>

      {dialogOpen ? (
        <WorkOrderDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          departments={departments}
        />
      ) : null}
    </div>
  );
}
