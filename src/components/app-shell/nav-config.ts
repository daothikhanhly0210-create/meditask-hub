import {
  Building2,
  LayoutDashboard,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/rbac";

export type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
};

export type NavGroup = {
  key: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    key: "nav.groups.main",
    items: [{ key: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    key: "nav.groups.administration",
    items: [
      { key: "nav.users", href: "/admin/users", icon: Users, permission: "user:manage" },
      {
        key: "nav.departments",
        href: "/admin/departments",
        icon: Building2,
        permission: "department:manage",
      },
    ],
  },
  {
    key: "nav.groups.account",
    items: [{ key: "nav.profile", href: "/profile", icon: UserCircle }],
  },
];
