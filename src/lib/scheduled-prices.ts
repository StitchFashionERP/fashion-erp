"use client";

export type ScheduledArticlePrice = {
  id: string;
  productId: string;
  variantId: string;
  salesPrice: number;
  recommendedRetailPrice: number;
  validFrom: string;
  validUntil: string;
  note: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedScheduledPrice = {
  salesPrice: number;
  recommendedRetailPrice: number;
  scheduleId: string;
  sourceLabel: string;
};

const storageKey = "fashion-erp-scheduled-article-prices-v1";

function createId() {
  return `scheduled-price-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

function safeMoney(value: number) {
  return (
    Math.round(Math.max(0, Number(value) || 0) * 100) /
    100
  );
}

function read(): ScheduledArticlePrice[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return [];
  }

  try {
    return (
      JSON.parse(stored) as ScheduledArticlePrice[]
    ).map((item) => ({
      ...item,
      variantId: item.variantId || "",
      salesPrice: safeMoney(item.salesPrice),
      recommendedRetailPrice: safeMoney(
        item.recommendedRetailPrice,
      ),
      validFrom: item.validFrom || "",
      validUntil: item.validUntil || "",
      note: item.note || "",
      isActive: item.isActive !== false,
      createdBy: item.createdBy || "Daan",
    }));
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

function save(items: ScheduledArticlePrice[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify(items),
  );
}

export function getScheduledArticlePrices() {
  return read().sort((first, second) =>
    second.validFrom.localeCompare(first.validFrom),
  );
}

export function createScheduledArticlePrice(input: {
  productId: string;
  variantId?: string;
  salesPrice: number;
  recommendedRetailPrice: number;
  validFrom: string;
  validUntil?: string;
  note?: string;
  createdBy?: string;
}) {
  const timestamp = now();

  const item: ScheduledArticlePrice = {
    id: createId(),
    productId: input.productId,
    variantId: input.variantId || "",
    salesPrice: safeMoney(input.salesPrice),
    recommendedRetailPrice: safeMoney(
      input.recommendedRetailPrice,
    ),
    validFrom: input.validFrom,
    validUntil: input.validUntil || "",
    note: input.note?.trim() || "",
    isActive: true,
    createdBy: input.createdBy || "Daan",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  save([item, ...read()]);
  return item;
}

export function updateScheduledArticlePrice(
  id: string,
  changes: Partial<ScheduledArticlePrice>,
) {
  const items = read().map((item) =>
    item.id === id
      ? {
          ...item,
          ...changes,
          salesPrice:
            typeof changes.salesPrice === "number"
              ? safeMoney(changes.salesPrice)
              : item.salesPrice,
          recommendedRetailPrice:
            typeof changes.recommendedRetailPrice ===
            "number"
              ? safeMoney(
                  changes.recommendedRetailPrice,
                )
              : item.recommendedRetailPrice,
          updatedAt: now(),
        }
      : item,
  );

  save(items);

  return items.find((item) => item.id === id) ?? null;
}

export function deleteScheduledArticlePrice(id: string) {
  save(read().filter((item) => item.id !== id));
}

function isActiveOnDate(
  item: ScheduledArticlePrice,
  date: string,
) {
  if (!item.isActive) {
    return false;
  }

  if (item.validFrom && date < item.validFrom) {
    return false;
  }

  if (item.validUntil && date > item.validUntil) {
    return false;
  }

  return true;
}

export function resolveScheduledArticlePrice(input: {
  productId: string;
  variantId?: string;
  date?: string;
}): ResolvedScheduledPrice | null {
  const date =
    input.date || new Date().toISOString().slice(0, 10);

  const matches = read()
    .filter((item) => {
      if (item.productId !== input.productId) {
        return false;
      }

      if (
        item.variantId &&
        item.variantId !== (input.variantId || "")
      ) {
        return false;
      }

      return isActiveOnDate(item, date);
    })
    .sort((first, second) => {
      const firstVariant = first.variantId ? 1 : 0;
      const secondVariant = second.variantId ? 1 : 0;

      if (firstVariant !== secondVariant) {
        return secondVariant - firstVariant;
      }

      return second.validFrom.localeCompare(
        first.validFrom,
      );
    });

  const selected = matches[0];

  if (!selected) {
    return null;
  }

  return {
    salesPrice: selected.salesPrice,
    recommendedRetailPrice:
      selected.recommendedRetailPrice,
    scheduleId: selected.id,
    sourceLabel: selected.variantId
      ? `Toekomstprijs variant vanaf ${selected.validFrom}`
      : `Toekomstprijs artikel vanaf ${selected.validFrom}`,
  };
}
