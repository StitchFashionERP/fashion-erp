import { getStoredProducts } from "@/lib/articles";
import { isValidEan13 } from "@/lib/barcodes";

export type EanStatus = "AVAILABLE" | "ASSIGNED" | "BLOCKED";

export type EanPoolItem = {
  ean: string;
  status: EanStatus;
  productId?: string;
  variantId?: string;
  productCode?: string;
  productName?: string;
  variantLabel?: string;
  importedAt: string;
  assignedAt?: string;
  blockedAt?: string;
  note?: string;
};

export type EanImportResult = {
  imported: number;
  duplicates: number;
  invalid: number;
  skipped: string[];
};

const storageKey = "fashion-erp-ean-pool-v1";

export function normalizeEan(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function clearAssignment(item: EanPoolItem): EanPoolItem {
  return {
    ean: item.ean,
    status: "AVAILABLE",
    importedAt: item.importedAt,
    note: item.note,
  };
}

function syncAssignments(items: EanPoolItem[]) {
  const assignments = new Map<
    string,
    Omit<EanPoolItem, "ean" | "status" | "importedAt">
  >();

  for (const product of getStoredProducts()) {
    for (const variant of product.variants) {
      const ean = normalizeEan(variant.ean);
      if (!ean) continue;

      assignments.set(ean, {
        productId: product.id,
        variantId: variant.id,
        productCode: product.code,
        productName: product.name,
        variantLabel: [variant.color, variant.size]
          .filter(Boolean)
          .join(" · "),
        assignedAt: new Date().toISOString(),
      });
    }
  }

  const known = new Set(items.map((item) => item.ean));
  const synced = items.map((item) => {
    const assignment = assignments.get(item.ean);

    if (item.status === "BLOCKED") return item;
    if (!assignment) {
      return item.status === "ASSIGNED" ? clearAssignment(item) : item;
    }

    return {
      ...item,
      ...assignment,
      status: "ASSIGNED" as const,
      assignedAt: item.assignedAt ?? assignment.assignedAt,
    };
  });

  for (const [ean, assignment] of assignments.entries()) {
    if (known.has(ean)) continue;

    synced.push({
      ean,
      status: "ASSIGNED",
      importedAt: assignment.assignedAt ?? new Date().toISOString(),
      ...assignment,
    });
  }

  return synced.sort((a, b) => a.ean.localeCompare(b.ean));
}

function readStoredPool() {
  if (typeof window === "undefined") return [] as EanPoolItem[];

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [] as EanPoolItem[];

  try {
    const parsed = JSON.parse(raw) as EanPoolItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

export function getEanPool() {
  if (typeof window === "undefined") return [] as EanPoolItem[];

  const stored = readStoredPool();
  const synced = syncAssignments(stored);

  if (JSON.stringify(stored) !== JSON.stringify(synced)) {
    saveEanPool(synced);
  }

  return synced;
}

export function saveEanPool(items: EanPoolItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

export function getAvailableEans(options?: {
  includeAssignedToProductId?: string;
}) {
  return getEanPool().filter(
    (item) =>
      item.status === "AVAILABLE" ||
      (item.status === "ASSIGNED" &&
        Boolean(options?.includeAssignedToProductId) &&
        item.productId === options?.includeAssignedToProductId),
  );
}

export function isEanSelectable(
  ean: string,
  options?: { currentProductId?: string },
) {
  const normalized = normalizeEan(ean);
  if (!normalized || !isValidEan13(normalized)) return false;

  const item = getEanPool().find((entry) => entry.ean === normalized);
  if (!item || item.status === "BLOCKED") return false;
  if (item.status === "AVAILABLE") return true;

  return Boolean(
    options?.currentProductId && item.productId === options.currentProductId,
  );
}

export function importEans(values: unknown[]): EanImportResult {
  const current = getEanPool();
  const existing = new Set(current.map((item) => item.ean));
  const seen = new Set<string>();
  const additions: EanPoolItem[] = [];
  const skipped: string[] = [];
  let duplicates = 0;
  let invalid = 0;
  const now = new Date().toISOString();

  for (const value of values) {
    const ean = normalizeEan(value);

    if (!ean || !isValidEan13(ean)) {
      invalid += 1;
      if (ean) skipped.push(`${ean}: ongeldige EAN-13`);
      continue;
    }

    if (existing.has(ean) || seen.has(ean)) {
      duplicates += 1;
      skipped.push(`${ean}: bestaat al`);
      continue;
    }

    seen.add(ean);
    additions.push({ ean, status: "AVAILABLE", importedAt: now });
  }

  saveEanPool([...current, ...additions]);
  return { imported: additions.length, duplicates, invalid, skipped };
}

export function setEanBlocked(ean: string, blocked: boolean) {
  const items = getEanPool().map((item) => {
    if (item.ean !== ean || item.status === "ASSIGNED") return item;

    return blocked
      ? {
          ...item,
          status: "BLOCKED" as const,
          blockedAt: new Date().toISOString(),
        }
      : {
          ...item,
          status: "AVAILABLE" as const,
          blockedAt: undefined,
        };
  });

  saveEanPool(items);
  return items;
}

export function deleteEans(eans: string[]) {
  const selected = new Set(eans);
  const items = getEanPool().filter(
    (item) => !selected.has(item.ean) || item.status === "ASSIGNED",
  );

  saveEanPool(items);
  return items;
}
