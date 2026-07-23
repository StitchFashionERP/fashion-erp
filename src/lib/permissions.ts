"use client";

import type {
  UserRole,
} from "@/lib/users";

export type Permission =
  | "view_dashboard"
  | "manage_sales"
  | "manage_warehouse"
  | "manage_purchasing"
  | "manage_finance"
  | "manage_settings";

const rolePermissions: Record<
  UserRole,
  Permission[]
> = {
  Administrator: [
    "view_dashboard",
    "manage_sales",
    "manage_warehouse",
    "manage_purchasing",
    "manage_finance",
    "manage_settings",
  ],
  Sales: [
    "view_dashboard",
    "manage_sales",
  ],
  Inkoop: [
    "view_dashboard",
    "manage_purchasing",
  ],
  Magazijn: [
    "view_dashboard",
    "manage_warehouse",
  ],
  Finance: [
    "view_dashboard",
    "manage_finance",
  ],
  "Alleen lezen": [
    "view_dashboard",
  ],
};

const activeRoleKey =
  "stitch-erp-active-role-v1";

export function getActiveRole(): UserRole {
  if (typeof window === "undefined") {
    return "Administrator";
  }

  return (
    (window.localStorage.getItem(
      activeRoleKey,
    ) as UserRole | null) ||
    "Administrator"
  );
}

export function setActiveRole(role: UserRole) {
  window.localStorage.setItem(
    activeRoleKey,
    role,
  );
  window.dispatchEvent(
    new CustomEvent(
      "stitch-active-role-changed",
    ),
  );
}

export function hasPermission(
  permission: Permission,
  role = getActiveRole(),
) {
  return rolePermissions[role].includes(
    permission,
  );
}
