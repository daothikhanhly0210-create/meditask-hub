"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "@/components/i18n-provider";
import { isOverdue, rollupProgress } from "@/lib/tasks";
import { cn, formatDate } from "@/lib/utils";
import type { SubTaskItem, TargetItem } from "../types";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline" | "destructive"
> = {
  NEW: "outline",
  IN_PROGRESS: "warning",
  PENDING_REVIEW: "default",
  DONE: "success",
};

type Bucket = {
  id: string;
  name: string;
  total: number;
  done: number;
  progress: number;
  incomplete: SubTaskItem[];
};

/** Group a department's sub-tasks by main assignee and roll up their progress. */
function buildBuckets(target: TargetItem): {
  buckets: Bucket[];
  unassigned: Bucket | null;
  idle: { id: string; name: string }[];
} {
  const grouped = new Map<string, { id: string; name: string; tasks: SubTaskItem[] }>();
  const ensure = (id: string, name: string) => {
    let entry = grouped.get(id);
    if (!entry) {
      entry = { id, name, tasks: [] };
      grouped.set(id, entry);
    }
    return entry;
  };

  for (const subTask of target.subTasks) {
    const entry = ensure(
      subTask.mainAssignee?.id ?? "__unassigned__",
      subTask.mainAssignee?.name ?? "",
    );
    entry.tasks.push(subTask);
  }

  const toBucket = (entry: { id: string; name: string; tasks: SubTaskItem[] }): Bucket => {
    const rollup = rollupProgress(entry.tasks.map((task) => task.status));
    return {
      id: entry.id,
      name: entry.name,
      total: rollup.total,
      done: rollup.done,
      progress: rollup.progress,
      incomplete: entry.tasks.filter((task) => task.status !== "DONE"),
    };
  };

  const unassignedEntry = grouped.get("__unassigned__");
  const buckets = [...grouped.values()]
    .filter((entry) => entry.id !== "__unassigned__")
    .map(toBucket)
    .sort((a, b) => {
      if (a.progress !== b.progress) return a.progress - b.progress;
      return a.name.localeCompare(b.name);
    });

  const idle = target.members.filter(
    (member) => !grouped.has(member.id) && member.id !== target.head?.id,
  );

  return {
    buckets,
    unassigned: unassignedEntry ? toBucket(unassignedEntry) : null,
    idle,
  };
}

function IncompleteList({ bucket, locale }: { bucket: Bucket; locale: string }) {
  const t = useTranslations();
  if (bucket.incomplete.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("tasks.noIncompleteWork")}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {bucket.incomplete.map((subTask) => {
        const overdue = isOverdue(subTask.dueDate, false);
        return (
          <li key={subTask.id} className="rounded-md bg-muted/50 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium">{subTask.title}</span>
              <Badge variant={STATUS_VARIANT[subTask.status] ?? "secondary"}>
                {t(`tasks.statuses.${subTask.status}`)}
              </Badge>
              {overdue ? <Badge variant="destructive">{t("tasks.overdue")}</Badge> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <span>
                {t("tasks.dueDateLabel")}: {formatDate(subTask.dueDate, locale)}
              </span>
              {subTask.collaborators.length > 0 ? (
                <span>
                  {t("tasks.collaborators")}:{" "}
                  {subTask.collaborators.map((person) => person.name).join(", ")}
                </span>
              ) : null}
            </div>
            {subTask.rejectReason ? (
              <p className="mt-1 text-xs text-destructive">
                {t("tasks.rejectReason")}: {subTask.rejectReason}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function BucketRow({
  bucket,
  locale,
  highlight,
}: {
  bucket: Bucket;
  locale: string;
  highlight?: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const done = bucket.progress === 100;
  const name =
    bucket.id === "__unassigned__" ? t("tasks.unassignedWork") : bucket.name || t("tasks.unassignedWork");

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 p-2 text-left"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <UserRound
          className={cn(
            "size-4 shrink-0",
            bucket.id === "__unassigned__" ? "text-destructive" : "text-muted-foreground",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
        {bucket.id === "__unassigned__" ? (
          <Badge variant="destructive">{t("tasks.notAssigned")}</Badge>
        ) : null}
        {done ? (
          <Badge variant="success">{t("tasks.targetComplete")}</Badge>
        ) : (
          <Badge variant={highlight ? "warning" : "secondary"}>
            {t("tasks.targetIncomplete")}
          </Badge>
        )}
        <span className="w-24 shrink-0">
          <Progress value={bucket.progress} />
        </span>
        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {t("tasks.doneOfTotal", { done: String(bucket.done), total: String(bucket.total) })}
        </span>
      </button>
      {open ? (
        <div className="border-t border-border p-2">
          <IncompleteList bucket={bucket} locale={locale} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Board/head view: which department member has not finished, and exactly what
 * is outstanding. Rendered inside a work-order target card.
 */
export function ProgressReport({ target, locale }: { target: TargetItem; locale: string }) {
  const t = useTranslations();
  const { buckets, unassigned, idle } = buildBuckets(target);

  return (
    <div className="space-y-2">
      {unassigned ? <BucketRow bucket={unassigned} locale={locale} highlight /> : null}
      {buckets.map((bucket) => (
        <BucketRow key={bucket.id} bucket={bucket} locale={locale} highlight={bucket.progress < 100} />
      ))}
      {buckets.length === 0 && !unassigned ? (
        <p className="text-sm text-muted-foreground">{t("tasks.noSubTasks")}</p>
      ) : null}

      {idle.length > 0 ? (
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5" />
          {t("tasks.idleMembers")}: {idle.map((member) => member.name).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
