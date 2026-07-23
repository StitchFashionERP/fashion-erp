"use client";

import {
  useEffect,
  type ReactNode,
} from "react";
import {
  brandingChangedEvent,
  getBrandingSettings,
} from "@/lib/branding";

export function BrandingProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    function apply() {
      const settings = getBrandingSettings();
      const root = document.documentElement;

      root.style.setProperty(
        "--primary",
        settings.primaryColor,
      );
      root.style.setProperty(
        "--sidebar",
        settings.sidebarColor,
      );
      root.style.setProperty(
        "--sidebar-active",
        settings.sidebarActiveColor,
      );
      root.style.setProperty(
        "--background",
        settings.backgroundColor,
      );

      document.title = settings.appName;

      if (settings.faviconDataUrl) {
        let link = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement | null;

        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }

        link.href = settings.faviconDataUrl;
      }
    }

    apply();
    window.addEventListener(
      brandingChangedEvent,
      apply,
    );

    return () =>
      window.removeEventListener(
        brandingChangedEvent,
        apply,
      );
  }, []);

  return children;
}
