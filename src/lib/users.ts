"use client";

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

export function getAppUsers() {
  if (typeof window === "undefined") return defaults;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return defaults;
  try {
    return JSON.parse(stored) as AppUser[];
  } catch {
    return defaults;
  }
}

export function saveAppUsers(users: AppUser[]) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(users),
  );

  window.dispatchEvent(
    new CustomEvent(appUsersChangedEvent),
  );
}

export function getActiveAppUser() {
  return (
    getAppUsers().find(
      (user) => user.active,
    ) ?? getAppUsers()[0] ?? null
  );
}
