import type { Role } from "@/lib/rbac";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  jobTitle: string | null;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type DepartmentOption = {
  id: string;
  name: string;
};
