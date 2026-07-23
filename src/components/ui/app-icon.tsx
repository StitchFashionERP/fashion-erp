"use client";

import type { SVGProps } from "react";

export type AppIconName =
  | "menu"
  | "search"
  | "bell"
  | "help"
  | "dashboard"
  | "sales"
  | "purchasing"
  | "inventory"
  | "finance"
  | "customers"
  | "suppliers"
  | "products"
  | "reports"
  | "settings"
  | "trend"
  | "wallet"
  | "clipboard"
  | "box"
  | "document"
  | "truck"
  | "shirt"
  | "userPlus"
  | "chart"
  | "arrowRight"
  | "chevronDown"
  | "check"
  | "clock";

const paths: Record<
  AppIconName,
  React.ReactNode
> = {
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.6 2.6 0 1 1 4.3 2c-.9.7-2 1.3-2 3" />
      <path d="M12 18h.01" />
    </>
  ),
  dashboard: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  sales: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H7" />
    </>
  ),
  purchasing: (
    <>
      <path d="M4 7h16l-1.5 13h-13z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      <path d="M9 12h6" />
    </>
  ),
  inventory: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  finance: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 12h2" />
      <path d="M14 12h2" />
      <path d="M8 16h2" />
      <path d="M14 16h2" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M16 4a3 3 0 0 1 0 6" />
      <path d="M19 21v-2a5 5 0 0 0-3-4.6" />
    </>
  ),
  suppliers: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M2 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M16 11h6" />
      <path d="m19 8 3 3-3 3" />
    </>
  ),
  products: (
    <>
      <path d="M8 4 4 8l3 3v9h10v-9l3-3-4-4-2 2h-4z" />
      <path d="M10 6c0 2 4 2 4 0" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.6V21h-4v-.1A1.8 1.8 0 0 0 8.8 19a1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 13.5H3v-4h.1A1.8 1.8 0 0 0 4.8 8a1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10.3 2H14v.1A1.8 1.8 0 0 0 15.1 4a1.8 1.8 0 0 0 2-.4l.1-.1L20 6.3l-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21 9.5h.1v4H21a1.8 1.8 0 0 0-1.6 1.5Z" />
    </>
  ),
  trend: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 2 5-6" />
      <path d="M15 7h4v4" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h14a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2z" />
      <path d="M4 7V5a2 2 0 0 1 2-2h11" />
      <path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  document: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </>
  ),
  shirt: (
    <>
      <path d="M8 4 4 8l3 3v9h10v-9l3-3-4-4-2 2h-4z" />
      <path d="M10 6c0 2 4 2 4 0" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M18 8v6" />
      <path d="M15 11h6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V9" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  chevronDown: (
    <path d="m7 10 5 5 5-5" />
  ),
  check: (
    <path d="m5 12 4 4L19 6" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export function AppIcon({
  name,
  size = 20,
  strokeWidth = 1.8,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
