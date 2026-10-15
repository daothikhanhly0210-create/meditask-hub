"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/components/i18n-provider";
import {
  addFollowerAction,
  approveSubTaskAction,
  cancelWorkOrderAction,
  deleteSubTaskAction,
  removeFollowerAction,
  reportSubTaskCompleteAction,
  reportTargetAction,
  rejectSubTaskAction,
  updateProgressAction,
} from "@/server/actions/tasks";
import type { ActionState } from "@/lib/action-state";
import { isOverdue } from "@/lib/tasks";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AttachmentSection } from "./attachment-section";
import { CommentSection } from "./comment-section";
import { SubTaskDialog } from "./sub-task-dialog";
import { WorkOrderDialog } from "../work-order-dialog";
import type { SubTaskItem, TargetItem, WorkOrderDetail } from "../types";

type FormAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

async function runAction(action: FormAction, values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return action(undefined, formData);
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline" | "destructive"
> = {
  OPEN: "secondary",
  NEW: "outline",
  IN_PROGRESS: "warning",
  PENDING_REVIEW: "default",
  DONE: "success",
  CANCELLED: "outline",
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

function SubTaskRow({
  subTask,
  target,
  locale,
  currentUserId,
}: {
  subTask: SubTaskItem;
  target: TargetItem;
  locale: string;
  currentUserId: string;
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState(String(subTask.progress));
  const [editing, setEditing] = useState(false);

  const overdue = isOverdue(subTask.dueDate, subTask.status === "DONE");

  const act = (action: FormAction, values: Record<string, string>, key: string) => {
    startTransition(async () => {
      const result = await runAction(action, values);
      if (result.ok) toast.success(t(result.message ?? key));
      else toast.error(t(result.message ?? "messages.actionFailed"));
    });
  };

  const approve = () => act(approveSubTaskAction, { subTaskId: subTask.id }, "messages.subTaskApproved");
  const report = () =>
    act(reportSubTaskCompleteAction, { subTaskId: subTask.id }, "messages.subTaskReported");
  const remove = () => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    act(deleteSubTaskAction, { subTaskId: subTask.id }, "messages.subTaskDeleted");
  };
  const reject = () => {
    const reason = window.prompt(t("tasks.rejectPrompt"));
    if (!reason) return;
    act(rejectSubTaskAction, { subTaskId: subTask.id, reason }, "messages.subTaskRejected");
  };
  const saveProgress = () =>
    act(
      updateProgressAction,
      { subTaskId: subTask.id, progress },
      "messages.progressUpdated",
    );

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{subTask.title}</span>
            <Badge variant={STATUS_VARIANT[subTask.status] ?? "secondary"}>
              {t(`tasks.statuses.${subTask.status}`)}
            </Badge>
            <Badge variant={PRIORITY_VARIANT[subTask.priority] ?? "secondary"}>
              {t(`tasks.priorities.${subTask.priority}`)}
            </Badge>
            {overdue ? <Badge variant="destructive">{t("tasks.overdue")}</Badge> : null}
          </div>
          {subTask.description ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{subTask.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t("tasks.mainAssignee")}:{" "}
              <span className="text-foreground/80">
                {subTask.mainAssignee?.name ?? t("common.none")}
              </span>
            </span>
            {subTask.collaborators.length > 0 ? (
              <span>
                {t("tasks.collaborators")}:{" "}
                <span className="text-foreground/80">
                  {subTask.collaborators.map((collaborator) => collaborator.name).join(", ")}
                </span>
              </span>
            ) : null}
            <span>
              {t("tasks.dueDateLabel")}:{" "}
              <span className={overdue ? "font-medium text-destructive" : "text-foreground/80"}>
                {formatDate(subTask.dueDate, locale)}
              </span>
            </span>
          </div>
          {subTask.rejectReason ? (
            <p className="text-xs text-destructive">
              {t("tasks.rejectReason")}: {subTask.rejectReason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {subTask.canWork && subTask.status !== "DONE" && subTask.status !== "PENDING_REVIEW" ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={report}>
              <Check />
              {t("tasks.reportComplete")}
            </Button>
          ) : null}
          {subTask.canManage && subTask.status === "PENDING_REVIEW" ? (
            <>
              <Button size="sm" disabled={pending} onClick={approve}>
                <Check />
                {t("tasks.approve")}
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={reject}>
                <RotateCcw />
                {t("tasks.reject")}
              </Button>
            </>
          ) : null}
          {subTask.canManage ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                title={t("common.edit")}
                onClick={() => setEditing(true)}
              >
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" title={t("common.delete")} disabled={pending} onClick={remove}>
                <Trash2 className="text-destructive" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Progress value={subTask.progress} className="max-w-48 flex-1" />
        <span className="text-xs tabular-nums text-muted-foreground">{subTask.progress}%</span>
        {subTask.canWork && subTask.status !== "DONE" ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
              aria-label={t("tasks.progressLabel")}
            />
            <Button size="sm" variant="ghost" disabled={pending} onClick={saveProgress}>
              {t("tasks.updateProgress")}
            </Button>
          </div>
        ) : null}
      </div>

      <details className="mt-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ChevronDown className="size-3.5" />
          {t("tasks.commentsTitle")} ({subTask.comments.length}) · {t("tasks.attachmentsTitle")} (
          {subTask.attachments.length})
        </summary>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("tasks.commentsTitle")}
            </h4>
            <CommentSection
              subTaskId={subTask.id}
              comments={subTask.comments}
              currentUserId={currentUserId}
              canDeleteAny={subTask.canManage}
              locale={locale}
            />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("tasks.attachmentsTitle")}
            </h4>
            <AttachmentSection
              subTaskId={subTask.id}
              attachments={subTask.attachments}
              currentUserId={currentUserId}
              canDeleteAny={subTask.canManage}
              locale={locale}
            />
          </div>
        </div>
      </details>

      {editing ? (
        <SubTaskDialog
          open={editing}
          onClose={() => setEditing(false)}
          targetId={target.id}
          departmentName={target.departmentName}
          members={target.members}
          subTask={subTask}
        />
      ) : null}
    </div>
  );
}

function TargetCard({
  target,
  locale,
  currentUserId,
}: {
  target: TargetItem;
  locale: string;
  currentUserId: string;
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const report = () => {
    startTransition(async () => {
      const result = await runAction(reportTargetAction, { targetId: target.id });
      if (result.ok) toast.success(t(result.message ?? "messages.targetReported"));
      else toast.error(t(result.message ?? "messages.actionFailed"));
    });
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{target.departmentName}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {target.reportedAt ? (
              <Badge variant="success">{t("tasks.targetReported")}</Badge>
            ) : target.suggestReport ? (
              <Badge variant="warning">{t("tasks.autoSuggestDone")}</Badge>
            ) : null}
            {target.canReport && !target.reportedAt ? (
              <Button size="sm" variant={target.suggestReport ? "default" : "outline"} disabled={pending} onClick={report}>
                <Check />
                {t("tasks.reportTarget")}
              </Button>
            ) : null}
            {target.canManage ? (
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <Plus />
                {t("tasks.newSubTask")}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            {t("tasks.targetHead")}:{" "}
            <span className="text-foreground/80">{target.head?.name ?? t("tasks.noHead")}</span>
          </span>
          <div className="flex min-w-40 flex-1 items-center gap-2">
            <Progress value={target.progress} />
            <span className="tabular-nums">{target.progress}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {target.subTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("tasks.noSubTasks")}</p>
        ) : (
          target.subTasks.map((subTask) => (
            <SubTaskRow
              key={subTask.id}
              subTask={subTask}
              target={target}
              locale={locale}
              currentUserId={currentUserId}
            />
          ))
        )}
      </CardContent>

      {adding ? (
        <SubTaskDialog
          open={adding}
          onClose={() => setAdding(false)}
          targetId={target.id}
          departmentName={target.departmentName}
          members={target.members}
        />
      ) : null}
    </Card>
  );
}

export function DetailClient({
  workOrder,
  locale,
}: {
  workOrder: WorkOrderDetail;
  locale: string;
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const cancel = () => {
    if (!window.confirm(t("tasks.cancelWorkOrderConfirm"))) return;
    startTransition(async () => {
      const result = await runAction(cancelWorkOrderAction, { workOrderId: workOrder.id });
      if (result.ok) toast.success(t(result.message ?? "messages.workOrderCancelled"));
      else toast.error(t(result.message ?? "messages.actionFailed"));
    });
  };

  const removeFollower = (userId: string) => {
    startTransition(async () => {
      const result = await runAction(removeFollowerAction, {
        workOrderId: workOrder.id,
        userId,
      });
      if (result.ok) toast.success(t(result.message ?? "messages.followerRemoved"));
      else toast.error(t(result.message ?? "messages.actionFailed"));
    });
  };

  const editValues = {
    id: workOrder.id,
    title: workOrder.title,
    description: workOrder.description,
    priority: workOrder.priority,
    dueDate: workOrder.dueDate,
    departmentIds: workOrder.targets.map((target) => target.departmentId),
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Header */}
        <div className="space-y-2">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("tasks.back")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{workOrder.code}</span>
            <Badge variant={STATUS_VARIANT[workOrder.status] ?? "secondary"}>
              {t(`tasks.statuses.${workOrder.status}`)}
            </Badge>
            <Badge variant={PRIORITY_VARIANT[workOrder.priority] ?? "secondary"}>
              {t(`tasks.priorities.${workOrder.priority}`)}
            </Badge>
            {workOrder.overdue ? (
              <Badge variant="destructive">{t("tasks.overdue")}</Badge>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{workOrder.title}</h1>
          <p className="text-xs text-muted-foreground">
            {t("tasks.dueDateLabel")}:{" "}
            <span className={workOrder.overdue ? "font-medium text-destructive" : undefined}>
              {formatDate(workOrder.dueDate, locale)}
            </span>{" "}
            · {workOrder.createdBy.name} · {formatDateTime(workOrder.createdAt, locale)}
          </p>
        </div>

        {workOrder.canManageWorkOrder ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              {t("common.edit")}
            </Button>
            {workOrder.status !== "CANCELLED" && workOrder.status !== "DONE" ? (
              <Button variant="destructive" disabled={pending} onClick={cancel}>
                <Ban />
                {t("tasks.cancelWorkOrder")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Progress value={workOrder.progress} className="flex-1" />
            <span className="text-sm font-medium tabular-nums">{workOrder.progress}%</span>
          </div>
        </CardHeader>
        {workOrder.description ? (
          <CardContent className="pt-0">
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{workOrder.description}</p>
          </CardContent>
        ) : null}
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("tasks.targets")}</h2>
        {workOrder.targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("tasks.noTargets")}</p>
        ) : (
          workOrder.targets.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              locale={locale}
              currentUserId={workOrder.currentUserId}
            />
          ))
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("tasks.followers")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workOrder.followers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("tasks.noFollowers")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {workOrder.followers.map((follower) => (
                <Badge key={follower.id} variant="secondary" className="gap-1">
                  {follower.name}
                  {workOrder.canFollow ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeFollower(follower.id)}
                      aria-label={t("common.delete")}
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </Badge>
              ))}
            </div>
          )}

          {workOrder.canFollow ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value=""
                onChange={(event) => {
                  const userId = event.target.value;
                  if (!userId) return;
                  startTransition(async () => {
                    const result = await runAction(addFollowerAction, {
                      workOrderId: workOrder.id,
                      userId,
                    });
                    if (result.ok) toast.success(t(result.message ?? "messages.followerAdded"));
                    else toast.error(t(result.message ?? "messages.actionFailed"));
                  });
                }}
                className="w-56"
                aria-label={t("tasks.addFollower")}
              >
                <option value="">{t("tasks.addFollower")}</option>
                {workOrder.followerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
              <span className="text-xs text-muted-foreground">{t("tasks.followersHint")}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("tasks.commentsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentSection
              workOrderId={workOrder.id}
              comments={workOrder.comments}
              currentUserId={workOrder.currentUserId}
              canDeleteAny={workOrder.canManageWorkOrder}
              locale={locale}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("tasks.attachmentsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentSection
              workOrderId={workOrder.id}
              attachments={workOrder.attachments}
              currentUserId={workOrder.currentUserId}
              canDeleteAny={workOrder.canManageWorkOrder}
              locale={locale}
            />
          </CardContent>
        </Card>
      </div>

      {editing ? (
        <WorkOrderDialog
          open={editing}
          onClose={() => setEditing(false)}
          departments={workOrder.departmentOptions}
          workOrder={editValues}
        />
      ) : null}
    </div>
  );
}
