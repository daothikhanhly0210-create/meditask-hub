import { z } from "zod";
import type { FieldErrors } from "@/lib/action-state";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length > 0 ? trimmed : null;
    });

export const roleSchema = z.enum(["ADMIN", "DIRECTOR", "SECRETARY", "DEPT_HEAD", "STAFF"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "validation.nameTooShort").max(120, "validation.nameTooLong"),
  email: z
    .string()
    .trim()
    .min(3, "validation.emailRequired")
    .max(200, "validation.emailTooLong")
    .email("validation.emailInvalid"),
  password: z.string().min(8, "validation.passwordTooShort").max(100, "validation.passwordTooLong"),
  role: roleSchema,
  departmentId: optionalText(50),
  jobTitle: optionalText(120),
  phone: optionalText(30),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({ isActive: z.boolean() });

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "validation.passwordTooShort").max(100, "validation.passwordTooLong"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "validation.passwordRequired"),
  newPassword: z.string().min(8, "validation.passwordTooShort").max(100, "validation.passwordTooLong"),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "validation.nameTooShort").max(120, "validation.nameTooLong"),
  code: z
    .string()
    .trim()
    .min(2, "validation.codeRequired")
    .max(20, "validation.codeTooLong")
    .regex(/^[A-Za-z0-9_-]+$/, "validation.codeFormat"),
  nameEn: optionalText(120),
  description: optionalText(500),
  headId: optionalText(50),
});

export const prioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const taskTitle = z
  .string()
  .trim()
  .min(2, "validation.titleTooShort")
  .max(200, "validation.titleTooLong");

export const workOrderSchema = z.object({
  title: taskTitle,
  description: optionalText(2000),
  priority: prioritySchema,
  dueDate: optionalText(30),
  departmentIds: z.array(z.string().min(1)).min(1, "validation.departmentRequired"),
});

export const subTaskSchema = z.object({
  targetId: z.string().min(1),
  title: taskTitle,
  description: optionalText(2000),
  priority: prioritySchema,
  dueDate: optionalText(30),
  mainAssigneeId: optionalText(50),
  collaboratorIds: z.array(z.string().min(1)),
});

export const closeTargetSchema = z.object({
  targetId: z.string().min(1),
  reason: z.string().trim().min(2, "validation.closeReasonRequired").max(500),
});

export const commentSchema = z
  .object({
    workOrderId: optionalText(50),
    subTaskId: optionalText(50),
    body: z.string().trim().min(1, "validation.commentRequired").max(2000, "validation.commentTooLong"),
  })
  .refine((value) => Boolean(value.workOrderId) !== Boolean(value.subTaskId), {
    message: "messages.invalidData",
  });

export const rejectSubTaskSchema = z.object({
  subTaskId: z.string().min(1),
  reason: z.string().trim().min(2, "validation.rejectReasonRequired").max(500),
});

// ---------------------------------------------------------------------------
// B4 — Meetings & minutes
// ---------------------------------------------------------------------------

const meetingTitle = z
  .string()
  .trim()
  .min(2, "validation.titleTooShort")
  .max(200, "validation.titleTooLong");

export const meetingSchema = z.object({
  title: meetingTitle,
  meetingDate: z.string().trim().min(1, "validation.dateRequired").max(30),
  location: optionalText(200),
  chairName: optionalText(120),
  secretaryName: optionalText(120),
  participantIds: z.array(z.string().min(1)),
  // Free-text attendees, one name per line.
  participantNames: z.string().max(2000).optional().nullable(),
});

export const minuteSchema = z.object({
  meetingId: z.string().min(1),
  summary: optionalText(2000),
  content: z
    .string()
    .trim()
    .min(1, "validation.contentRequired")
    .max(20000, "validation.contentTooLong"),
  decisions: optionalText(5000),
});

export const actionItemSchema = z.object({
  meetingId: z.string().min(1),
  actionItemId: optionalText(50),
  title: taskTitle,
  description: optionalText(2000),
  dueDate: optionalText(30),
  departmentId: optionalText(50),
  assigneeId: optionalText(50),
});

export const meetingEmailSchema = z.object({
  meetingId: z.string().min(1),
  recipients: z
    .string()
    .trim()
    .min(3, "validation.emailRequired")
    .max(2000, "validation.emailTooLong"),
});

export type MeetingInput = z.infer<typeof meetingSchema>;
export type MinuteInput = z.infer<typeof minuteSchema>;
export type ActionItemInput = z.infer<typeof actionItemSchema>;

export type WorkOrderInput = z.infer<typeof workOrderSchema>;
export type SubTaskInput = z.infer<typeof subTaskSchema>;
export type CommentInput = z.infer<typeof commentSchema>;

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;

/**
 * Convert a ZodError into a field -> messages map without relying on
 * version-specific helpers (works on Zod 3 and 4).
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
