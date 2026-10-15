"use client";

import { Fragment, useMemo, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Download, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { cn, formatDate } from "@/lib/utils";
import {
  buildReport,
  isRowOverdue,
  rowProgress,
  toCsv,
  type DepartmentOption,
  type KpiSummary,
  type ReportScope,
  type ReportSubTaskRow,
  type ReportTables,
  type ReportWorkOrderRow,
} from "@/lib/reports";

const SUB_TASK_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline" | "destructive"
> = {
  NEW: "outline",
  IN_PROGRESS: "warning",
  PENDING_REVIEW: "default",
  DONE: "success",
};

const EMPTY_KPI: KpiSummary = {
  workOrders: 0,
  open: 0,
  inProgress: 0,
  done: 0,
  cancelled: 0,
  subTasks: 0,
  subTasksDone: 0,
  overdue: 0,
  pendingReview: 0,
  progress: 0,
};

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "destructive" | "success";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tabular-nums",
            tone === "destructive"
              ? "text-destructive"
              : tone === "success"
                ? "text-success"
                : undefined,
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ReportsClient({
  scope,
  locale,
  canFilterDepartment,
  departments,
  workOrders,
  subTasks,
  overviewKpi,
}: {
  scope: ReportScope;
  locale: string;
  canFilterDepartment: boolean;
  departments: DepartmentOption[];
  workOrders: ReportWorkOrderRow[];
  subTasks: ReportSubTaskRow[];
  overviewKpi: KpiSummary | null;
}) {
  const t = useTranslations();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [expanded, setExpanded] = useState<string[]>([]);

  const isOverview = scope === "overview";

  const filteredWorkOrders = useMemo(
    () =>
      workOrders.filter((order) => {
        if (departmentId !== "ALL" && !order.departmentIds.includes(departmentId)) return false;
        const day = order.createdAt.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [workOrders, departmentId, from, to],
  );

  const filteredSubTasks = useMemo(
    () =>
      subTasks.filter((row) => {
        if (departmentId !== "ALL" && row.departmentId !== departmentId) return false;
        const day = row.workOrderCreatedAt.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [subTasks, departmentId, from, to],
  );

  const report = useMemo<ReportTables>(() => {
    if (isOverview) {
      return {
        kpi: overviewKpi ?? EMPTY_KPI,
        departments: [],
        staff: [],
        overdue: [],
      };
    }
    const reportDepartments =
      departmentId === "ALL" ? departments : departments.filter((dept) => dept.id === departmentId);
    return buildReport({
      workOrders: filteredWorkOrders,
      subTasks: filteredSubTasks,
      departments: reportDepartments,
    });
  }, [isOverview, overviewKpi, filteredWorkOrders, filteredSubTasks, departments, departmentId]);

  const toggle = (id: string) =>
    setExpanded((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  function handleExport() {
    const header = [
      t("fields.department"),
      t("reports.csvWorkOrderCode"),
      t("reports.csvWorkOrder"),
      t("reports.csvSubTask"),
      t("tasks.mainAssignee"),
      t("fields.status"),
      t("reports.csvProgress"),
      t("tasks.dueDateLabel"),
      t("reports.csvOverdue"),
    ];
    const body = filteredSubTasks.map((row) => [
      row.departmentName,
      row.workOrderCode,
      row.workOrderTitle,
      row.title,
      row.assigneeName ?? t("tasks.notAssigned"),
      row.closed ? t("tasks.targetClosed") : t(`tasks.statuses.${row.status}`),
      rowProgress(row),
      row.dueDate ? formatDate(row.dueDate, locale) : "",
      isRowOverdue(row) ? t("common.yes") : t("common.no"),
    ]);
    const csv = toCsv([header, ...body]);

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const kpi = report.kpi;
  const hasFilters = Boolean(from || to || departmentId !== "ALL");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isOverview ? t("reports.overviewTitle") : t("reports.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOverview
              ? t("reports.overviewSubtitle")
              : scope === "department"
                ? t("reports.departmentSubtitle")
                : t("reports.subtitle")}
          </p>
        </div>
        {!isOverview ? (
          <Button variant="outline" onClick={handleExport}>
            <Download />
            {t("reports.exportCsv")}
          </Button>
        ) : null}
      </div>

      {!isOverview ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="report-from">
              {t("reports.filterFrom")}
            </label>
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="report-to">
              {t("reports.filterTo")}
            </label>
            <Input
              id="report-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-40"
            />
          </div>
          {canFilterDepartment ? (
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="report-department"
              >
                {t("fields.department")}
              </label>
              <Select
                id="report-department"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className="w-56"
              >
                <option value="ALL">{t("reports.allDepartments")}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {hasFilters ? (
            <Button
              variant="ghost"
              onClick={() => {
                setFrom("");
                setTo("");
                setDepartmentId("ALL");
              }}
            >
              {t("reports.clearFilters")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("reports.kpiProgress")}
          value={`${kpi.progress}%`}
          hint={t("tasks.doneOfTotal", {
            done: String(kpi.subTasksDone),
            total: String(kpi.subTasks),
          })}
        />
        <StatCard
          label={t("reports.kpiWorkOrders")}
          value={kpi.workOrders}
          hint={`${t("tasks.statuses.OPEN")} ${kpi.open} · ${t("tasks.statuses.IN_PROGRESS")} ${kpi.inProgress} · ${t("tasks.statuses.DONE")} ${kpi.done}`}
        />
        <StatCard
          label={t("reports.kpiSubTasks")}
          value={kpi.subTasks}
          hint={t("tasks.doneOfTotal", {
            done: String(kpi.subTasksDone),
            total: String(kpi.subTasks),
          })}
        />
        <StatCard
          label={t("reports.kpiOverdue")}
          value={kpi.overdue}
          tone={kpi.overdue > 0 ? "destructive" : "default"}
          hint={`${t("reports.kpiPendingReview")}: ${kpi.pendingReview}`}
        />
      </div>

      {isOverview ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <BarChart3 className="size-4" />
            {t("reports.overviewNotice")}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">{t("reports.byDepartment")}</h2>
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fields.department")}</TableHead>
                    <TableHead className="w-48">{t("tasks.progressLabel")}</TableHead>
                    <TableHead>{t("reports.doneOfTotalColumn")}</TableHead>
                    <TableHead>{t("reports.kpiOverdue")}</TableHead>
                    <TableHead>{t("reports.kpiPendingReview")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        {t("reports.noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.departments.map((department) => {
                      const open = expanded.includes(department.id);
                      return (
                        <Fragment key={department.id}>
                          <TableRow>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => toggle(department.id)}
                                className="flex items-center gap-2 font-medium hover:text-primary"
                              >
                                {open ? (
                                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                )}
                                {department.name}
                              </button>
                            </TableCell>
                            <TableCell>
                              <Progress
                                value={department.progress}
                                tone={department.progress === 100 ? "success" : "default"}
                              />
                              <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                                {department.progress}%
                              </span>
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {t("tasks.doneOfTotal", {
                                done: String(department.done),
                                total: String(department.total),
                              })}
                            </TableCell>
                            <TableCell>
                              {department.overdue > 0 ? (
                                <Badge variant="destructive">{department.overdue}</Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {department.pendingReview > 0 ? (
                                <Badge variant="default">{department.pendingReview}</Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {open ? (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-muted/30">
                                {department.incomplete.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    {t("tasks.noIncompleteWork")}
                                  </p>
                                ) : (
                                  <ul className="space-y-2">
                                    {department.incomplete.map((row) => (
                                      <li
                                        key={row.id}
                                        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                                      >
                                        <span className="font-medium">{row.title}</span>
                                        <Badge variant={SUB_TASK_VARIANT[row.status] ?? "secondary"}>
                                          {row.closed ? t("tasks.targetClosed") : t(`tasks.statuses.${row.status}`)}
                                        </Badge>
                                        {isRowOverdue(row) ? (
                                          <Badge variant="destructive">{t("tasks.overdue")}</Badge>
                                        ) : null}
                                        <span className="text-xs text-muted-foreground">
                                          {row.assigneeName ?? t("tasks.notAssigned")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {t("tasks.dueDateLabel")}: {formatDate(row.dueDate, locale)}
                                        </span>
                                        <span className="font-mono text-xs text-muted-foreground">
                                          {row.workOrderCode}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Trophy className="size-4 text-muted-foreground" />
              {t("reports.byStaff")}
            </h2>
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>{t("tasks.mainAssignee")}</TableHead>
                    <TableHead>{t("fields.department")}</TableHead>
                    <TableHead className="w-48">{t("tasks.progressLabel")}</TableHead>
                    <TableHead>{t("reports.doneOfTotalColumn")}</TableHead>
                    <TableHead>{t("reports.kpiOverdue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.staff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {t("reports.noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.staff.map((person, index) => (
                      <TableRow key={person.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {person.departmentName ?? t("common.none")}
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={person.progress}
                            tone={person.progress === 100 ? "success" : "default"}
                          />
                          <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                            {person.progress}%
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {t("tasks.doneOfTotal", {
                            done: String(person.done),
                            total: String(person.total),
                          })}
                        </TableCell>
                        <TableCell>
                          {person.overdue > 0 ? (
                            <Badge variant="destructive">{person.overdue}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">{t("reports.overdueList")}</h2>
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fields.department")}</TableHead>
                    <TableHead>{t("reports.csvSubTask")}</TableHead>
                    <TableHead>{t("reports.csvWorkOrder")}</TableHead>
                    <TableHead>{t("tasks.mainAssignee")}</TableHead>
                    <TableHead>{t("tasks.dueDateLabel")}</TableHead>
                    <TableHead>{t("fields.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.overdue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {t("reports.noOverdue")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.overdue.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground">{row.departmentName}</TableCell>
                        <TableCell className="font-medium">{row.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="font-mono">{row.workOrderCode}</span>
                          <span className="mt-1 block max-w-64 truncate">{row.workOrderTitle}</span>
                        </TableCell>
                        <TableCell>{row.assigneeName ?? t("tasks.notAssigned")}</TableCell>
                        <TableCell className="font-medium text-destructive">
                          {formatDate(row.dueDate, locale)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={SUB_TASK_VARIANT[row.status] ?? "secondary"}>
                            {t(`tasks.statuses.${row.status}`)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
