import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { asRole, can, type Permission, type Role } from "@/lib/rbac";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  jobTitle: string | null;
  phone: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  headedDepartmentId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: { select: { id: true, name: true } },
      headedDepartment: { select: { id: true } },
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: asRole(user.role),
    isActive: user.isActive,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? null,
    jobTitle: user.jobTitle,
    phone: user.phone,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    headedDepartmentId: user.headedDepartment?.id ?? null,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    redirect("/dashboard");
  }
  return user;
}
