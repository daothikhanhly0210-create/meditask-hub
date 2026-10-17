"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Search, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/lib/utils";
import { convertActionItemAction } from "@/server/actions/meetings";
import type { ActionItemRow } from "../types";

type ConversionFilter = "ALL" | "PENDING" | "CONVERTED";
type WorkStateFilter =
  | "ALL"
  | "UNASSIGNED"
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "DONE"
  | "CANCELLED";

const WORK_STATE_VARIANT: Record<
  ActionItemRow["workState"],
  "default" | "secondary" | "success" | "warning" | "outline" | "destructive"
> = {
  UNASSIGNED: "outline",
  OPEN: "secondary",
  IN_PROGRESS: "warning",
  PENDING_REVIEW: "default",
  DONE: "success",
  CANCELLED: "destructive",
};

const CONVERSION_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "outline"
> = {
  false: "outline",
  true: "success",
};

export function ActionsClient({
  rows,
  locale,
  canConvert,
}: {
  rows: ActionItemRow[];
  locale: string;
  canConvert: boolean;
}) {
  const t = useTranslations();

  const [search, setSearch] = useState("");
  const [conversion, setConversion] = useState<ConversionFilter>("ALL");
  const [workState, setWorkState] = useState<WorkStateFilter>("ALL");
  const [department, setDepartment] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [meetingCode, setMeetingCode] = useState("ALL");

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.departmentName) set.add(r.departmentName);
    }
    return Array.from(set).sort();
  }, [rows]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.assigneeName) set.add(r.assigneeName);
    }
    return Array.from(set).sort();
  }, [rows]);

  const meetingCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.meetingCode) set.add(r.meetingCode);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (conversion === "PENDING" && r.converted) return false;
      if (conversion === "CONVERTED" && !r.converted) return false;
      if (workState !== "ALL" && r.workState !== workState) return false;
      if (department !== "ALL" && r.departmentName !== department) return false;
      if (assignee !== "ALL" && r.assigneeName !== assignee) return false;
      if (meetingCode !== "ALL" && r.meetingCode !== meetingCode) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        r.meetingCode.toLowerCase().includes(q) ||
        r.meetingTitle.toLowerCase().includes(q) ||
        (r.departmentName?.toLowerCase().includes(q) ?? false) ||
        (r.assigneeName?.toLowerCase().includes(q) ?? false) ||
        (r.workOrderCode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, conversion, workState, department, assignee, meetingCode]);

  const handleConvert = (id: string) => {
    const form = new FormData();
    form.append("actionItemId", id);
    void convertActionItemAction(undefined, form);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("actions.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("actions.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListChecks className="size-4" />
          <span>
            {t("common.total")}: {filtered.length}
          </span>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("actions.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={meetingCode} onChange={(e) => setMeetingCode(e.target.value)}>
          <option value="ALL">{t("actions.filter.meetingCode")}</option>
          {meetingCodes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="ALL">{t("fields.department")}</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="ALL">{t("fields.assignee")}</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          value={conversion}
          onChange={(e) => setConversion(e.target.value as ConversionFilter)}
        >
          <option value="ALL">{t("actions.conversion.all")}</option>
          <option value="PENDING">{t("actions.conversion.pending")}</option>
          <option value="CONVERTED">{t("actions.conversion.converted")}</option>
        </Select>
        <Select value={workState} onChange={(e) => setWorkState(e.target.value as WorkStateFilter)}>
          <option value="ALL">{t("actions.work.all")}</option>
          <option value="UNASSIGNED">{t("actions.work.unassigned")}</option>
          <option value="OPEN">{t("actions.work.open")}</option>
          <option value="IN_PROGRESS">{t("actions.work.inProgress")}</option>
          <option value="PENDING_REVIEW">{t("actions.work.pendingReview")}</option>
          <option value="DONE">{t("actions.work.done")}</option>
          <option value="CANCELLED">{t("actions.work.cancelled")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <AlertCircle className="size-6 text-muted-foreground" />
          <p className="font-medium">{t("common.noResults")}</p>
          <p className="text-sm text-muted-foreground">{t("actions.empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("meetings.actionItemLabel")}</TableHead>
                <TableHead>{t("actions.sourceMeeting")}</TableHead>
                <TableHead>{t("fields.department")}</TableHead>
                <TableHead>{t("fields.assignee")}</TableHead>
                <TableHead>{t("fields.dueDate")}</TableHead>
                <TableHead>{t("meetings.conversionStatus")}</TableHead>
                <TableHead>{t("meetings.workStatus")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{r.title}</span>
                        {r.description && (
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {r.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/meetings/${r.meetingId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {r.meetingCode} — {r.meetingTitle}
                      </Link>
                    </TableCell>
                    <TableCell>{r.departmentName ?? t("common.unset")}</TableCell>
                    <TableCell>{r.assigneeName ?? t("common.unset")}</TableCell>
                    <TableCell>
                      {r.dueDate ? (
                        <span className={r.overdue ? "text-destructive" : undefined}>
                          {formatDate(r.dueDate, locale)}
                        </span>
                      ) : (
                        t("common.unset")
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={CONVERSION_VARIANT[String(r.converted)]}>
                        {r.converted ? t("actions.conversion.converted") : t("actions.conversion.pending")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={WORK_STATE_VARIANT[r.workState]}>
                          {t(`actions.work.${r.workState.toLowerCase()}`)}
                        </Badge>
                        {r.converted && (
                          <div className="w-24">
                            <Progress value={r.progress} className="h-1.5" />
                            <span className="text-xs text-muted-foreground">{r.progress}%</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.converted && r.workOrderId && r.workOrderCode ? (
                          <Link
                            href={`/tasks/${r.workOrderId}`}
                            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {r.workOrderCode}
                          </Link>
                        ) : canConvert && !r.converted ? (
                          <Button size="sm" variant="outline" onClick={() => handleConvert(r.id)}>
                            {t("meetings.convert")}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}