"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n, useTranslations } from "@/components/i18n-provider";
import {
  approveMeetingAction,
  convertActionItemAction,
  deleteActionItemAction,
  deleteMeetingAction,
  reopenMeetingAction,
} from "@/server/actions/meetings";
import type { ActionState } from "@/lib/action-state";
import { isOverdue } from "@/lib/tasks";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { MeetingDialog } from "../meeting-dialog";
import type { ActionItemView, MeetingDetail, MeetingFormValues } from "../types";
import { ActionItemDialog } from "./action-item-dialog";
import { EmailDialog } from "./email-dialog";
import { MinuteEditor, MinuteViewer } from "./minute-editor";

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
  DRAFT: "secondary",
  MINUTED: "warning",
  APPROVED: "success",
};

export function DetailClient({ meeting, locale }: { meeting: MeetingDetail; locale: string }) {
  const t = useTranslations();
  const { locale: i18nLocale } = useI18n();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionItemView | undefined>(undefined);

  const formValues: MeetingFormValues = {
    id: meeting.id,
    title: meeting.title,
    meetingDate: meeting.meetingDate,
    location: meeting.location,
    chairName: meeting.chairName,
    secretaryName: meeting.secretaryName,
    participantIds: meeting.participants
      .map((participant) => participant.userId)
      .filter((value): value is string => Boolean(value)),
    participantNames: meeting.participants
      .filter((participant) => !participant.userId)
      .map((participant) => participant.name)
      .join("\n"),
  };

  const act = (
    action: FormAction,
    values: Record<string, string>,
    fallback: string,
    confirmMessage?: string,
  ) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    startTransition(async () => {
      const result = await runAction(action, values);
      if (result.ok) toast.success(t(result.message ?? fallback));
      else toast.error(t(result.message ?? "messages.actionFailed"));
    });
  };

  const approve = () =>
    act(approveMeetingAction, { meetingId: meeting.id }, "messages.meetingApproved");
  const reopen = () =>
    act(reopenMeetingAction, { meetingId: meeting.id }, "messages.meetingReopened");
  const removeMeeting = () =>
    act(
      deleteMeetingAction,
      { meetingId: meeting.id },
      "messages.meetingDeleted",
      t("meetings.deleteConfirm", { title: meeting.title }),
    );
  const convertItem = (item: ActionItemView) =>
    act(
      convertActionItemAction,
      { actionItemId: item.id },
      "messages.actionItemConverted",
      t("meetings.convertConfirm", { title: item.title }),
    );
  const removeItem = (item: ActionItemView) =>
    act(
      deleteActionItemAction,
      { actionItemId: item.id },
      "messages.actionItemDeleted",
      t("common.confirmDelete"),
    );

  const openNewItem = () => {
    setEditingItem(undefined);
    setActionDialogOpen(true);
  };
  const openEditItem = (item: ActionItemView) => {
    setEditingItem(item);
    setActionDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("meetings.back")}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{meeting.code}</span>
            <Badge variant={STATUS_VARIANT[meeting.status] ?? "secondary"}>
              {t(`meetings.statuses.${meeting.status}`)}
            </Badge>
            <span>{formatDate(meeting.meetingDate, locale)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/meetings/${meeting.id}/export?format=docx`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <FileText />
            {t("meetings.exportWord")}
          </a>
          <a
            href={`/api/meetings/${meeting.id}/export?format=pdf`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download />
            {t("meetings.exportPdf")}
          </a>
          {meeting.canRecord ? (
            <>
              <Button variant="outline" onClick={() => setEmailOpen(true)}>
                <Mail />
                {t("meetings.sendEmail")}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                {t("common.edit")}
              </Button>
            </>
          ) : null}
          {meeting.canApprove ? (
            meeting.status === "APPROVED" ? (
              <Button variant="outline" onClick={reopen} disabled={pending}>
                <RotateCcw />
                {t("meetings.reopen")}
              </Button>
            ) : (
              <Button onClick={approve} disabled={pending}>
                <Check />
                {t("meetings.approve")}
              </Button>
            )
          ) : null}
          {meeting.canRecord ? (
            <Button variant="ghost" onClick={removeMeeting} disabled={pending}>
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("meetings.infoTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Info label={t("meetings.dateLabel")} value={formatDate(meeting.meetingDate, locale)} />
          <Info label={t("meetings.locationLabel")} value={meeting.location ?? "—"} />
          <Info label={t("meetings.chairLabel")} value={meeting.chairName ?? "—"} />
          <Info label={t("meetings.secretaryLabel")} value={meeting.secretaryName ?? "—"} />
          <Info label={t("meetings.createdByLabel")} value={meeting.createdByName} />
          <Info
            label={t("meetings.approvedByLabel")}
            value={
              meeting.approvedByName
                ? `${meeting.approvedByName}${
                    meeting.approvedAt
                      ? ` · ${formatDateTime(meeting.approvedAt, locale)}`
                      : ""
                  }`
                : "—"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("meetings.participantsLabel")}</CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("meetings.noParticipants")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {meeting.participants.map((participant) => (
                <li
                  key={participant.id}
                  className="rounded-md border border-border bg-background px-3 py-1 text-sm"
                >
                  {participant.name}
                  {participant.role ? (
                    <span className="ml-1 text-xs text-muted-foreground">({participant.role})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("meetings.minuteTitle")}</span>
            {meeting.minute ? (
              <span className="text-xs font-normal text-muted-foreground">
                {t("meetings.updatedAt")} {formatDateTime(meeting.minute.updatedAt, locale)}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.canRecord ? (
            <MinuteEditor meetingId={meeting.id} minute={meeting.minute} />
          ) : (
            <MinuteViewer minute={meeting.minute} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("meetings.actionItemsLabel")}</span>
            {meeting.canRecord ? (
              <Button size="sm" onClick={openNewItem}>
                <Plus />
                {t("meetings.newActionItem")}
              </Button>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("meetings.actionItemLabel")}</TableHead>
                <TableHead>{t("fields.department")}</TableHead>
                <TableHead>{t("meetings.assigneeLabel")}</TableHead>
                <TableHead>{t("tasks.dueDateLabel")}</TableHead>
                <TableHead>{t("meetings.workOrderLabel")}</TableHead>
                {meeting.canRecord ? <TableHead>{t("common.actions")}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {meeting.actionItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={meeting.canRecord ? 6 : 5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t("meetings.noActionItems")}
                  </TableCell>
                </TableRow>
              ) : (
                meeting.actionItems.map((item) => {
                  const overdue = isOverdue(item.dueDate, Boolean(item.workOrderId));
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-72">
                        <span className="font-medium">{item.title}</span>
                        {item.description ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{item.departmentName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{item.assigneeName ?? "—"}</TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap text-sm",
                          overdue && "font-medium text-destructive",
                        )}
                      >
                        {item.dueDate ? formatDate(item.dueDate, locale) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.workOrderId ? (
                          <Link
                            href={`/tasks/${item.workOrderId}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {item.workOrderCode}
                          </Link>
                        ) : (
                          <Badge variant="outline">{t("meetings.notConverted")}</Badge>
                        )}
                      </TableCell>
                      {meeting.canRecord ? (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!item.workOrderId && meeting.canConvert ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => convertItem(item)}
                                disabled={pending}
                              >
                                {t("meetings.convert")}
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditItem(item)}
                              aria-label={t("common.edit")}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item)}
                              disabled={pending}
                              aria-label={t("common.delete")}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                        ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meeting.canRecord ? (
        <>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={removeMeeting}
              disabled={pending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
              {t("meetings.deleteMeeting")}
            </Button>
          </div>
        </>
      ) : null}

      {meeting.canRecord ? (
        <>
          <MeetingDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            people={meeting.people}
            meeting={formValues}
          />
          <ActionItemDialog
            open={actionDialogOpen}
            onClose={() => setActionDialogOpen(false)}
            meetingId={meeting.id}
            departments={meeting.departments}
            people={meeting.people}
            item={editingItem}
          />
          <EmailDialog
            open={emailOpen}
            onClose={() => setEmailOpen(false)}
            meetingId={meeting.id}
            defaultRecipients={meeting.participantEmails.join(", ")}
            locale={i18nLocale}
          />
        </>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
