export const organizationRoles = [
  "owner",
  "admin",
  "sales",
  "purchasing",
  "warehouse",
  "finance",
  "read_only",
] as const;

export type OrganizationRole =
  (typeof organizationRoles)[number];

export const roleLabels: Record<OrganizationRole, string> = {
  owner: "Eigenaar",
  admin: "Administrator",
  sales: "Verkoop",
  purchasing: "Inkoop",
  warehouse: "Magazijn",
  finance: "Finance",
  read_only: "Alleen lezen",
};
