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

export const roleSchema = z.enum(["ADMIN", "BOSS", "SECRETARY", "DEPT_HEAD", "EMPLOYEE"]);

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
