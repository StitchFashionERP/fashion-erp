"use client";

export type StitchModuleSettings = {
  production: boolean;
};

const storageKey =
  "stitch-erp-module-settings-v1";

const defaults: StitchModuleSettings = {
  production: false,
};

export function getStitchModuleSettings() {
  if (typeof window === "undefined") {
    return defaults;
  }

  const stored = window.localStorage.getItem(
    storageKey,
  );

  if (!stored) {
    return defaults;
  }

  try {
    return {
      ...defaults,
      ...(JSON.parse(
        stored,
      ) as Partial<StitchModuleSettings>),
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaults;
  }
}

export function saveStitchModuleSettings(
  settings: StitchModuleSettings,
) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(settings),
    );

    window.dispatchEvent(
      new CustomEvent(
        "stitch-module-settings-changed",
      ),
    );
  }

  return settings;
}
