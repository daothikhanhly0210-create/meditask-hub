"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import {
  actionItemSchema,
  meetingEmailSchema,
  meetingSchema,
  minuteSchema,
  toFieldErrors,
} from "@/lib/validation";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { nextMeetingCode, nextWorkOrderCode } from "@/server/codes";
import { loadMeetingDocument } from "@/server/meeting-document";
import { meetingScope } from "@/lib/meetings";
import { minuteFileName } from "@/lib/export/minute-document";
import { buildMinuteDocx } from "@/lib/export/docx";
import { buildMinutePdf } from "@/lib/export/pdf";
import { sendMail } from "@/lib/mail";
import { createTranslator } from "@/i18n/translator";
import { defaultLocale, isLocale } from "@/i18n/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

function revalidateMeeting(meetingId?: string) {
  revalidatePath("/meetings");
  revalidatePath("/meetings/actions");
  if (meetingId) revalidatePath(`/meetings/${meetingId}`);
}

type ParticipantInput = { userId: string | null; name: string; role: string | null };

async function resolveParticipants(
  participantIds: string[],
  participantNames: string | null | undefined,
): Promise<ParticipantInput[]> {
  const users = participantIds.length
    ? await prisma.user.findMany({
        where: { id: { in: participantIds }, isActive: true },
        select: { id: true, name: true, jobTitle: true },
      })
    : [];

  const freeNames = (participantNames ?? "")
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  return [
    ...users.map((user) => ({ userId: user.id, name: user.name, role: user.jobTitle })),
    ...freeNames.map((name) => ({ userId: null, name, role: null })),
  ];
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export async function createMeetingAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:record");

  const parsed = meetingSchema.safeParse({
    title: readText(formData, "title"),
    meetingDate: readText(formData, "meetingDate"),
    location: readText(formData, "location"),
    chairName: readText(formData, "chairName"),
    secretaryName: readText(formData, "secretaryName"),
    participantIds: readList(formData, "participantIds"),
    participantNames: readText(formData, "participantNames"),
  });

  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const meetingDate = parseDate(parsed.data.meetingDate);
  if (!meetingDate) {
    return errorState("validation.dateRequired", { meetingDate: ["validation.dateRequired"] });
  }

  const { title, location, chairName, secretaryName } = parsed.data;
  const participants = await resolveParticipants(
    parsed.data.participantIds,
    parsed.data.participantNames,
  );

  try {
    let created: { id: string } | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const code = await nextMeetingCode(tx);
          return tx.meeting.create({
            data: {
              code,
              title,
              meetingDate,
              location,
              chairName,
              secretaryName,
              status: "DRAFT",
              createdById: actor.id,
              participants: { create: participants },
            },
            select: { id: true },
          });
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 4) continue;
        throw error;
      }
    }

    if (!created) return errorState("messages.actionFailed");

    await recordAudit({
      actorId: actor.id,
      action: "meeting.create",
      entity: "Meeting",
      entityId: created.id,
      meta: { title, participants: participants.length },
    });
    revalidateMeeting(created.id);
    return successState("messages.meetingCreated");
  } catch (error) {
    console.error("[meetings] create failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function updateMeetingAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:record");
  const meetingId = readText(formData, "meetingId");
  if (!meetingId) return errorState("messages.invalidData");

  const parsed = meetingSchema.safeParse({
    title: readText(formData, "title"),
    meetingDate: readText(formData, "meetingDate"),
    location: readText(formData, "location"),
    chairName: readText(formData, "chairName"),
    secretaryName: readText(formData, "secretaryName"),
    participantIds: readList(formData, "participantIds"),
    participantNames: readText(formData, "participantNames"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const meetingDate = parseDate(parsed.data.meetingDate);
  if (!meetingDate) {
    return errorState("validation.dateRequired", { meetingDate: ["validation.dateRequired"] });
  }

  const existing = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { id: true } });
  if (!existing) return errorState("errors.generic");

  const { title, location, chairName, secretaryName } = parsed.data;
  const participants = await resolveParticipants(
    parsed.data.participantIds,
    parsed.data.participantNames,
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.meeting.update({
        where: { id: meetingId },
        data: { title, meetingDate, location, chairName, secretaryName },
      });
      // Attendees are replaced wholesale — the form always submits the full set.
      await tx.meetingParticipant.deleteMany({ where: { meetingId } });
      if (participants.length > 0) {
        await tx.meetingParticipant.createMany({
          data: participants.map((participant) => ({ ...participant, meetingId })),
        });
      }
    });

    await recordAudit({
      actorId: actor.id,
      action: "meeting.update",
      entity: "Meeting",
      entityId: meetingId,
      meta: { title },
    });
    revalidateMeeting(meetingId);
    return successState("messages.meetingUpdated");
  } catch (error) {
    console.error("[meetings] update failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function deleteMeetingAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:record");
  const meetingId = readText(formData, "meetingId");
  if (!meetingId) return errorState("messages.invalidData");

  try {
    await prisma.meeting.delete({ where: { id: meetingId } });
    await recordAudit({
      actorId: actor.id,
      action: "meeting.delete",
      entity: "Meeting",
      entityId: meetingId,
    });
    revalidateMeeting();
    return successState("messages.meetingDeleted");
  } catch (error) {
    console.error("[meetings] delete failed", error);
    return errorState("messages.actionFailed");
  }
}

// ---------------------------------------------------------------------------
// Minutes
// ---------------------------------------------------------------------------

export async function saveMinuteAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:record");
  const parsed = minuteSchema.safeParse({
    meetingId: readText(formData, "meetingId"),
    summary: readText(formData, "summary"),
    content: readText(formData, "content"),
    decisions: readText(formData, "decisions"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { meetingId, summary, content, decisions } = parsed.data;
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, status: true },
  });
  if (!meeting) return errorState("errors.generic");

  try {
    await prisma.minute.upsert({
      where: { meetingId },
      update: { summary, content, decisions },
      create: { meetingId, summary, content, decisions, createdById: actor.id },
    });
    if (meeting.status === "DRAFT") {
      await prisma.meeting.update({ where: { id: meetingId }, data: { status: "MINUTED" } });
    }

    await recordAudit({
      actorId: actor.id,
      action: "minute.save",
      entity: "Meeting",
      entityId: meetingId,
    });
    revalidateMeeting(meetingId);
    return successState("messages.minuteSaved");
  } catch (error) {
    console.error("[meetings] save minute failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function approveMeetingAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:approve");
  const meetingId = readText(formData, "meetingId");
  if (!meetingId) return errorState("messages.invalidData");

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, minute: { select: { id: true } } },
  });
  if (!meeting || !meeting.minute) return errorState("messages.minuteRequired");

  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "APPROVED", approvedById: actor.id, approvedAt: new Date() },
    });
    await recordAudit({
      actorId: actor.id,
      action: "meeting.approve",
      entity: "Meeting",
      entityId: meetingId,
    });
    revalidateMeeting(meetingId);
    return successState("messages.meetingApproved");
  } catch (error) {
    console.error("[meetings] approve failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function reopenMeetingAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:approve");
  const meetingId = readText(formData, "meetingId");
  if (!meetingId) return errorState("messages.invalidData");

  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "MINUTED", approvedById: null, approvedAt: null },
    });
    await recordAudit({
      actorId: actor.id,
      action: "meeting.reopen",
      entity: "Meeting",
      entityId: meetingId,
    });
    revalidateMeeting(meetingId);
    return successState("messages.meetingReopened");
  } catch (error) {
    console.error("[meetings] reopen failed", error);
    return errorState("messages.actionFailed");
  }
}

// ---------------------------------------------------------------------------
// Action items (đầu việc)
// ---------------------------------------------------------------------------

export async function saveActionItemAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:record");
  const parsed = actionItemSchema.safeParse({
    meetingId: readText(formData, "meetingId"),
    actionItemId: readText(formData, "actionItemId"),
    title: readText(formData, "title"),
    description: readText(formData, "description"),
    dueDate: readText(formData, "dueDate"),
    departmentId: readText(formData, "departmentId"),
    assigneeId: readText(formData, "assigneeId"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { meetingId, actionItemId, title, description, departmentId, assigneeId } = parsed.data;
  const dueDate = parseDate(parsed.data.dueDate);

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { id: true } });
  if (!meeting) return errorState("errors.generic");

  try {
    if (actionItemId) {
      await prisma.minuteActionItem.update({
        where: { id: actionItemId },
        data: { title, description, dueDate, departmentId, assigneeId },
      });
    } else {
      await prisma.minuteActionItem.create({
        data: { meetingId, title, description, dueDate, departmentId, assigneeId },
      });
    }

    await recordAudit({
      actorId: actor.id,
      action: actionItemId ? "action_item.update" : "action_item.create",
      entity: "MinuteActionItem",
      entityId: actionItemId ?? undefined,
      meta: { meetingId, title },
    });
    revalidateMeeting(meetingId);
    return successState(actionItemId ? "messages.actionItemUpdated" : "messages.actionItemCreated");
  } catch (error) {
    console.error("[meetings] save action item failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function deleteActionItemAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:record");
  const actionItemId = readText(formData, "actionItemId");
  if (!actionItemId) return errorState("messages.invalidData");

  try {
    const item = await prisma.minuteActionItem.delete({
      where: { id: actionItemId },
      select: { meetingId: true },
    });
    await recordAudit({
      actorId: actor.id,
      action: "action_item.delete",
      entity: "MinuteActionItem",
      entityId: actionItemId,
    });
    revalidateMeeting(item.meetingId);
    return successState("messages.actionItemDeleted");
  } catch (error) {
    console.error("[meetings] delete action item failed", error);
    return errorState("messages.actionFailed");
  }
}

/**
 * Turn an action item into a B2 work order addressed to the item's department.
 * The department head then breaks it down into sub-tasks, matching the standard
 * assignment flow. Already-converted items are rejected to avoid duplicates.
 */
export async function convertActionItemAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:assign:company");
  const actionItemId = readText(formData, "actionItemId");
  if (!actionItemId) return errorState("messages.invalidData");

  const item = await prisma.minuteActionItem.findFirst({
    where: {
      id: actionItemId,
      meeting: meetingScope(actor),
    },
    select: {
      id: true,
      meetingId: true,
      title: true,
      description: true,
      dueDate: true,
      departmentId: true,
      workOrderId: true,
      department: { select: { id: true, headId: true } },
    },
  });
  if (!item) return errorState("errors.generic");
  if (item.workOrderId) return errorState("messages.actionItemAlreadyConverted");

  const departmentId = item.departmentId;
  if (!departmentId) {
    return errorState("validation.departmentRequired", {
      departmentId: ["validation.departmentRequired"],
    });
  }

  try {
    let created: { id: string } | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const locked = (await tx.$queryRaw<Array<{ workOrderId: string | null }>>`
            SELECT "workOrderId" FROM "minute_action_items" WHERE id = ${item.id} FOR UPDATE
          `);
          if (locked.length === 0 || locked[0].workOrderId) return null;

          const code = await nextWorkOrderCode(tx);
          const workOrder = await tx.workOrder.create({
            data: {
              code,
              title: item.title,
              description: item.description,
              priority: "NORMAL",
              dueDate: item.dueDate,
              status: "OPEN",
              createdById: actor.id,
              targets: {
                create: [
                  { departmentId, headId: item.department?.headId ?? null },
                ],
              },
            },
            select: { id: true },
          });
          await tx.minuteActionItem.update({
            where: { id: item.id },
            data: { workOrderId: workOrder.id },
          });
          return workOrder;
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 4) continue;
        throw error;
      }
    }

    if (!created) {
      // Nếu đã được chuyển trong lúc retry, trả về thông báo đã chuyển
      const check = await prisma.minuteActionItem.findUnique({
        where: { id: item.id },
        select: { workOrderId: true },
      });
      if (check?.workOrderId) {
        revalidateMeeting(item.meetingId);
        revalidatePath("/tasks");
        return errorState("messages.actionItemAlreadyConverted");
      }
      return errorState("messages.actionFailed");
    }

    await recordAudit({
      actorId: actor.id,
      action: "action_item.convert",
      entity: "MinuteActionItem",
      entityId: item.id,
      meta: { meetingId: item.meetingId, workOrderId: created.id, departmentId },
    });
    revalidateMeeting(item.meetingId);
    revalidatePath("/tasks");
    return successState("messages.actionItemConverted");
  } catch (error) {
    console.error("[meetings] convert action item failed", error);
    return errorState("messages.actionFailed");
  }
}

// ---------------------------------------------------------------------------
// Email the minute (Word + PDF attachments)
// ---------------------------------------------------------------------------

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[;,\s]+/)
    .map((value) => value.trim())
    .filter((value) => value.includes("@"));
}

export async function emailMinuteAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("meeting:record");

  const parsed = meetingEmailSchema.safeParse({
    meetingId: readText(formData, "meetingId"),
    recipients: readText(formData, "recipients"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { meetingId } = parsed.data;
  const recipients = parseRecipients(parsed.data.recipients);
  if (recipients.length === 0) {
    return errorState("validation.emailInvalid", { recipients: ["validation.emailInvalid"] });
  }

  const localeValue = readText(formData, "locale");
  const locale = isLocale(localeValue) ? localeValue : defaultLocale;

  try {
    const document = await loadMeetingDocument(meetingId, locale);
    if (!document) return errorState("errors.generic");

    const t = createTranslator(locale);
    const [docx, pdf] = await Promise.all([
      buildMinuteDocx(document, t),
      buildMinutePdf(document, t),
    ]);

    const subject = `${t("meetings.minuteTitle")}: ${document.code} — ${document.title}`;
    const sent = await sendMail({
      to: recipients.join(", "),
      subject,
      text: `${subject}\n\n${document.summary ?? ""}\n`,
      attachments: [
        {
          filename: minuteFileName(document, "docx"),
          content: docx,
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        {
          filename: minuteFileName(document, "pdf"),
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });

    await recordAudit({
      actorId: actor.id,
      action: "minute.email",
      entity: "Meeting",
      entityId: meetingId,
      meta: { recipients: recipients.length, delivered: sent },
    });

    return successState(sent ? "messages.minuteEmailed" : "messages.minuteEmailSuppressed");
  } catch (error) {
    console.error("[meetings] email minute failed", error);
    return errorState("messages.actionFailed");
  }
}

