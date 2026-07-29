"use client";

import {
  getSharedStateValue,
  setSharedStateValue,
} from "@/lib/shared-state-client";

export type UserRole =
  | "Administrator"
  | "Sales"
  | "Inkoop"
  | "Magazijn"
  | "Finance"
  | "Alleen lezen";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};

const storageKey = "stitch-erp-users-v1";

export const appUsersSharedStateKeys = [storageKey] as const;

export const appUsersChangedEvent =
  "stitch-erp-users-changed";

const defaults: AppUser[] = [
  {
    id: "user-daan",
    name: "Daan",
    email: "",
    role: "Administrator",
    active: true,
  },
];

export const roles: UserRole[] = [
  "Administrator",
  "Sales",
  "Inkoop",
  "Magazijn",
  "Finance",
  "Alleen lezen",
];

function normalizeUsers(value: unknown): AppUser[] {
  if (!Array.isArray(value)) {
    return defaults;
  }

  const users = value
    .filter(
      (item): item is Partial<AppUser> =>
        typeof item === "object" && item !== null,
    )
    .map((user, index) => ({
      id:
        typeof user.id === "string" && user.id.trim()
          ? user.id
          : `user-${index + 1}`,
      name: typeof user.name === "string" ? user.name : "",
      email: typeof user.email === "string" ? user.email : "",
      role: roles.includes(user.role as UserRole)
        ? (user.role as UserRole)
        : "Alleen lezen",
      active: user.active !== false,
    }));

  return users.length > 0 ? users : defaults;
}

export function getAppUsers(): AppUser[] {
  return normalizeUsers(
    getSharedStateValue<unknown>(storageKey, defaults),
  );
}

export function saveAppUsers(users: AppUser[]): AppUser[] {
  const normalized = normalizeUsers(users);
  setSharedStateValue(storageKey, normalized);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(appUsersChangedEvent, {
        detail: normalized,
      }),
    );
  }

  return normalized;
}

export function getActiveAppUser(): AppUser | null {
  const users = getAppUsers();
  return users.find((user) => user.active) ?? users[0] ?? null;
}
