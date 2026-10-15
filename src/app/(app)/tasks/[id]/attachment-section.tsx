"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { deleteAttachmentAction, uploadAttachmentAction } from "@/server/actions/tasks";
import { idleState } from "@/lib/action-state";
import { ATTACHMENT_MAX_MB, formatBytes } from "@/lib/tasks";
import { formatDateTime } from "@/lib/utils";
import type { AttachmentItem } from "../types";

export function AttachmentSection({
  workOrderId,
  subTaskId,
  attachments,
  currentUserId,
  canDeleteAny,
  locale,
}: {
  workOrderId?: string;
  subTaskId?: string;
  attachments: AttachmentItem[];
  currentUserId: string;
  canDeleteAny: boolean;
  locale: string;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(uploadAttachmentAction, idleState);
  const [isDeleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<typeof state | null>(null);

  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      formRef.current?.reset();
      toast.success(t(state.message ?? "messages.attachmentAdded"));
    } else if (state.message) {
      toast.error(t(state.message, { max: ATTACHMENT_MAX_MB }));
    }
  }, [state, t]);

  const remove = (attachmentId: string) => {
    startDelete(async () => {
      const formData = new FormData();
      formData.set("attachmentId", attachmentId);
      const result = await deleteAttachmentAction(undefined, formData);
      if (result.ok) toast.success(t(result.message ?? "messages.attachmentDeleted"));
      else toast.error(t(result.message ?? "messages.actionFailed"));
    });
  };

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tasks.noAttachments")}</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/attachments/${attachment.id}`}
                  className="block truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {attachment.fileName}
                </a>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(attachment.size)} · {attachment.uploadedByName} ·{" "}
                  {formatDateTime(attachment.createdAt, locale)}
                </span>
              </div>
              {(canDeleteAny || attachment.uploadedById === currentUserId) && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  title={t("common.delete")}
                  onClick={() => remove(attachment.id)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
        {workOrderId ? <input type="hidden" name="workOrderId" value={workOrderId} /> : null}
        {subTaskId ? <input type="hidden" name="subTaskId" value={subTaskId} /> : null}
        <input
          type="file"
          name="file"
          className="block w-full max-w-xs text-sm file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <Upload />
          {t("tasks.attach")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("tasks.attachmentMax", { max: ATTACHMENT_MAX_MB })}
        </span>
      </form>
    </div>
  );
}
