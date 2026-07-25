"use client";

export type StitchBackupEntry = {
  key: string;
  value: string;
  byteSize: number;
  detectedType: "array" | "object" | "string" | "number" | "boolean" | "null" | "unknown";
  itemCount: number | null;
};

export type StitchBackup = {
  version: 2;
  createdAt: string;
  source: {
    origin: string;
    pathname: string;
    userAgent: string;
  };
  entries: Record<string, string>;
};

export type LocalStorageInspection = {
  key: string;
  byteSize: number;
  detectedType: StitchBackupEntry["detectedType"];
  itemCount: number | null;
  category: string;
};

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Deze actie kan alleen in de browser worden uitgevoerd.");
  }
}

function getByteSize(value: string): number {
  return new Blob([value]).size;
}

function inspectValue(value: string): Pick<StitchBackupEntry, "detectedType" | "itemCount"> {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return { detectedType: "array", itemCount: parsed.length };
    }

    if (parsed === null) {
      return { detectedType: "null", itemCount: null };
    }

    if (typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const possibleCollections = ["items", "data", "records", "customers", "products", "orders"];

      for (const key of possibleCollections) {
        if (Array.isArray(record[key])) {
          return { detectedType: "object", itemCount: record[key].length };
        }
      }

      return { detectedType: "object", itemCount: Object.keys(record).length };
    }

    if (typeof parsed === "string") {
      return { detectedType: "string", itemCount: null };
    }

    if (typeof parsed === "number") {
      return { detectedType: "number", itemCount: null };
    }

    if (typeof parsed === "boolean") {
      return { detectedType: "boolean", itemCount: null };
    }
  } catch {
    return { detectedType: "string", itemCount: null };
  }

  return { detectedType: "unknown", itemCount: null };
}

function categorizeKey(key: string): string {
  const normalized = key.toLowerCase();

  if (normalized.includes("customer") || normalized.includes("klant")) return "Klanten";
  if (normalized.includes("article") || normalized.includes("product")) return "Artikelen";
  if (normalized.includes("sales") || normalized.includes("order")) return "Verkooporders";
  if (normalized.includes("inventory") || normalized.includes("warehouse") || normalized.includes("stock")) return "Voorraad & warehouse";
  if (normalized.includes("supplier") || normalized.includes("purchase")) return "Leveranciers & inkoop";
  if (normalized.includes("invoice")) return "Facturen";
  if (normalized.includes("user") || normalized.includes("auth") || normalized.includes("session")) return "Gebruikers & sessies";
  if (normalized.includes("setting") || normalized.includes("config") || normalized.includes("branding")) return "Instellingen";
  return "Overig";
}

export function inspectLocalStorage(): LocalStorageInspection[] {
  assertBrowser();

  const result: LocalStorageInspection[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;

    const value = window.localStorage.getItem(key) ?? "";
    const inspected = inspectValue(value);

    result.push({
      key,
      byteSize: getByteSize(value),
      detectedType: inspected.detectedType,
      itemCount: inspected.itemCount,
      category: categorizeKey(key),
    });
  }

  return result.sort((left, right) => {
    const categoryCompare = left.category.localeCompare(right.category, "nl");
    return categoryCompare !== 0 ? categoryCompare : left.key.localeCompare(right.key, "nl");
  });
}

export function createStitchBackup(): StitchBackup {
  assertBrowser();

  const entries: Record<string, string> = {};

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;

    // Bewust alle sleutels exporteren. Zo missen we geen oudere of afwijkend benoemde STiTch-data.
    entries[key] = window.localStorage.getItem(key) ?? "";
  }

  return {
    version: 2,
    createdAt: new Date().toISOString(),
    source: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      userAgent: window.navigator.userAgent,
    },
    entries,
  };
}

export function downloadStitchBackup(label = "computer"): string {
  const backup = createStitchBackup();
  const safeLabel = label.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-") || "computer";
  const timestamp = backup.createdAt.replace(/[:.]/g, "-");
  const filename = `stitch-lokale-data-${safeLabel}-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return filename;
}

export async function restoreStitchBackup(file: File): Promise<void> {
  assertBrowser();

  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<StitchBackup> & {
    version?: number;
    entries?: unknown;
  };

  if ((parsed.version !== 1 && parsed.version !== 2) || !parsed.entries || typeof parsed.entries !== "object") {
    throw new Error("Dit is geen geldige STiTch-back-up.");
  }

  const entries = parsed.entries as Record<string, unknown>;

  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== "string") {
      throw new Error(`De back-up bevat een ongeldige waarde voor '${key}'.`);
    }
  }

  Object.entries(entries).forEach(([key, value]) => {
    window.localStorage.setItem(key, value as string);
  });

  window.location.reload();
}
