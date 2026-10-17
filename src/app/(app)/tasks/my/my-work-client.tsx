"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/components/i18n-provider";
import { cn, formatDate } from "@/lib/utils";
import { Search } from "lucide-react";
import type { MySubTaskItem } from "../types";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline" | "destructive"
> = {
  NEW: "outline",
  IN_PROGRESS: "warning",
  PENDING_REVIEW: "default",
  DONE: "success",
};

const PRIORITY_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline" | "destructive"
> = {
  LOW: "outline",
  NORMAL: "secondary",
  HIGH: "warning",
  URGENT: "destructive",
};

function Row({ item, locale }: { item: MySubTaskItem; locale: string }) {
  const t = useTranslations();
  return (
    <Link
      href={`/tasks/${item.workOrderId}`}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{item.title}</span>
            <Badge variant={STATUS_VARIANT[item.status] ?? "secondary"}>
              {t(`tasks.statuses.${item.status}`)}
            </Badge>
            <Badge variant={PRIORITY_VARIANT[item.priority] ?? "secondary"}>
              {t(`tasks.priorities.${item.priority}`)}
            </Badge>
            {item.overdue ? <Badge variant="destructive">{t("tasks.overdue")}</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{item.workOrderCode}</span> · {item.workOrderTitle} ·{" "}
            {item.departmentName}
            {item.mainAssigneeName ? ` · ${t("tasks.mainAssignee")}: ${item.mainAssigneeName}` : ""}
          </p>
        </div>
        <div className="w-32 shrink-0">
          <Progress value={item.progress} />
          <span
            className={cn(
              "mt-1 block text-right text-xs tabular-nums",
              item.overdue ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            {formatDate(item.dueDate, locale)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MyWorkClient({ items, locale }: { items: MySubTaskItem[]; locale: string }) {
  const t = useTranslations();
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.departmentName) set.add(it.departmentName);
    return Array.from(set).sort();
  }, [items]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.mainAssigneeName) set.add(it.mainAssigneeName);
    return Array.from(set).sort();
  }, [items]);

  const filterItem = useCallback(
    (item: MySubTaskItem, includeCompleted: boolean): boolean => {
      if (!includeCompleted && item.status === "DONE") return false;
      if (status !== "ALL" && item.status !== status) return false;
      if (department !== "ALL" && item.departmentName !== department) return false;
      if (assignee !== "ALL" && item.mainAssigneeName !== assignee) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.workOrderTitle.toLowerCase().includes(q) ||
        item.workOrderCode.toLowerCase().includes(q) ||
        (item.departmentName?.toLowerCase().includes(q) ?? false) ||
        (item.mainAssigneeName?.toLowerCase().includes(q) ?? false)
      );
    },
    [status, department, assignee, search],
  );

  const { review, mine } = useMemo(() => {
    const reviewItems: MySubTaskItem[] = [];
    const myItems: MySubTaskItem[] = [];
    for (const item of items) {
      if (item.canApprove && item.status === "PENDING_REVIEW") {
        if (filterItem(item, true)) reviewItems.push(item);
        continue;
      }
      if (!showCompleted && item.status === "DONE") continue;
      if (filterItem(item, showCompleted)) myItems.push(item);
    }
    return { review: reviewItems, mine: myItems };
  }, [items, showCompleted, filterItem]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("tasks.myTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("tasks.mySubtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tasks.mySearchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="ALL">{t("fields.department")}</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="ALL">{t("fields.assignee")}</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">{t("tasks.statuses.ALL")}</option>
          <option value="NEW">{t("tasks.statuses.NEW")}</option>
          <option value="IN_PROGRESS">{t("tasks.statuses.IN_PROGRESS")}</option>
          <option value="PENDING_REVIEW">{t("tasks.statuses.PENDING_REVIEW")}</option>
          <option value="DONE">{t("tasks.statuses.DONE")}</option>
        </Select>
      </div>

      {review.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            {t("tasks.reviewTitle")}
            <Badge variant="default">{review.length}</Badge>
          </h2>
          <div className="space-y-2">
            {review.map((item) => (
              <Row key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t("tasks.myTitle")}</h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
            />
            {t("tasks.showCompleted")}
          </label>
        </div>

        {mine.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("tasks.myEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {mine.map((item) => (
              <Row key={item.id} item={item} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
