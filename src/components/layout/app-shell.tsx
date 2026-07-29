"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BusinessDataBootstrap } from "@/components/cloud/business-data-bootstrap";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (
    pathname === "/login" ||
    pathname.startsWith("/auth/")
  ) {
    return <>{children}</>;
  }

  return (
    <BusinessDataBootstrap>
      <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">{children}</main>
      </div>
      </div>
    </BusinessDataBootstrap>
  );
}
