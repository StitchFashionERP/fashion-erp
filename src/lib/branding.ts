"use client";

export type BrandingSettings = {
  appName: string;
  subtitle: string;
  primaryColor: string;
  sidebarColor: string;
  sidebarActiveColor: string;
  backgroundColor: string;
  logoDataUrl: string;
  faviconDataUrl: string;
};

const storageKey = "stitch-erp-branding-v1";
export const brandingChangedEvent =
  "stitch-erp-branding-changed";

export const defaultBrandingSettings: BrandingSettings = {
  appName: "STITCH ERP",
  subtitle: "Fashion management",
  primaryColor: "#0875c1",
  sidebarColor: "#263746",
  sidebarActiveColor: "#0875c1",
  backgroundColor: "#f4f6f8",
  logoDataUrl: "",
  faviconDataUrl: "",
};

export function getBrandingSettings(): BrandingSettings {
  if (typeof window === "undefined") {
    return defaultBrandingSettings;
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return defaultBrandingSettings;
  }

  try {
    return {
      ...defaultBrandingSettings,
      ...(JSON.parse(stored) as Partial<BrandingSettings>),
    };
  } catch {
    return defaultBrandingSettings;
  }
}

export function saveBrandingSettings(
  settings: BrandingSettings,
) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(settings),
  );

  window.dispatchEvent(
    new CustomEvent(brandingChangedEvent),
  );
}
