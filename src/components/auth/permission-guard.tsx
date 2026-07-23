"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getActiveRole,
  hasPermission,
  type Permission,
} from "@/lib/permissions";

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [allowed, setAllowed] =
    useState(false);

  useEffect(() => {
    function reload() {
      setAllowed(
        hasPermission(
          permission,
          getActiveRole(),
        ),
      );
    }

    reload();
    window.addEventListener(
      "stitch-active-role-changed",
      reload,
    );

    return () =>
      window.removeEventListener(
        "stitch-active-role-changed",
        reload,
      );
  }, [permission]);

  return allowed ? children : fallback;
}
