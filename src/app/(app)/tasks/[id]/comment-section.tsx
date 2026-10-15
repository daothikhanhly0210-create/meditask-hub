"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/components/i18n-provider";
import { addCommentAction, deleteCommentAction } from "@/server/actions/tasks";
import { idleState } from "@/lib/action-state";
import { formatDateTime } from "@/lib/utils";
import { initials } from "@/lib/utils";
import type { CommentItem } from "../types";

export function CommentSection({
  workOrderId,
  subTaskId,
  comments,
  currentUserId,
  canDeleteAny,
  locale,
}: {
  workOrderId?: string;
  subTaskId?: string;
  comments: CommentItem[];
  currentUserId: string;
  canDeleteAny: boolean;
  locale: string;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(addCommentAction, idleState);
  const [isDeleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<typeof state | null>(null);

  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      formRef.current?.reset();
      toast.success(t(state.message ?? "messages.commentAdded"));
    } else if (state.message) {
      toast.error(t(state.message));
    }
  }, [state, t]);

  const remove = (commentId: string) => {
    startDelete(async () => {
      const formData = new FormData();
      formData.set("commentId", commentId);
      const result = await deleteCommentAction(undefined, formData);
      if (result.ok) toast.success(t(result.message ?? "messages.attachmentDeleted"));
      else toast.error(t(result.message ?? "messages.actionFailed"));
    });
  };

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tasks.noComments")}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(comment.authorName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(comment.createdAt, locale)}
                  </span>
                  {(canDeleteAny || comment.authorId === currentUserId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-7"
                      disabled={isDeleting}
                      title={t("common.delete")}
                      onClick={() => remove(comment.id)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="space-y-2">
        {workOrderId ? <input type="hidden" name="workOrderId" value={workOrderId} /> : null}
        {subTaskId ? <input type="hidden" name="subTaskId" value={subTaskId} /> : null}
        <Textarea name="body" rows={2} maxLength={2000} placeholder={t("tasks.commentPlaceholder")} />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            <Send />
            {t("tasks.sendComment")}
          </Button>
        </div>
      </form>
    </div>
  );
}
