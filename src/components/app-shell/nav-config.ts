import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/rbac";

export type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  /** A single permission, or any one of several. */
  permission?: Permission | readonly Permission[];
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
    key: "nav.groups.work",
    items: [
      { key: "nav.workOrders", href: "/tasks", icon: ClipboardList, permission: "task:view" },
      { key: "nav.myWork", href: "/tasks/my", icon: ListChecks, permission: "task:view" },
      {
        key: "nav.meetings",
        href: "/meetings",
        icon: CalendarDays,
        permission: ["meeting:view", "meeting:record", "meeting:approve"],
      },
      {
        key: "nav.actionItems",
        href: "/meetings/actions",
        icon: ListChecks,
        permission: "meeting:view",
      },
      {
        key: "nav.reports",
        href: "/reports",
        icon: BarChart3,
        permission: ["report:company", "report:department", "report:overview"],
      },
    ],
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
