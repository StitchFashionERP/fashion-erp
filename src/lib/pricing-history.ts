"use client";

import type { Product } from "@/lib/articles";

export type PricingSnapshot = {
  supplierPurchasePrice: number;
  shippingCosts: number;
  otherCosts: number;
  totalCost: number;
  brandMarkup: number;
  salesPrice: number;
  retailerMarkup: number;
  recommendedRetailPrice: number;
};

export type PricingHistoryEntry = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  action: "created" | "updated" | "targets-applied";
  changedBy: string;
  createdAt: string;
  before: PricingSnapshot | null;
  after: PricingSnapshot;
  changedFields: string[];
};

const storageKey = "fashion-erp-pricing-history-v1";

function createId() {
  return `pricing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getProductPricingSnapshot(
  product: Pick<
    Product,
    | "purchasePrice"
    | "shippingCosts"
    | "otherCosts"
    | "totalCost"
    | "brandMarkup"
    | "wholesalePrice"
    | "retailerMarkup"
    | "recommendedRetailPrice"
  >,
): PricingSnapshot {
  return {
    supplierPurchasePrice: product.purchasePrice,
    shippingCosts: product.shippingCosts,
    otherCosts: product.otherCosts,
    totalCost: product.totalCost,
    brandMarkup: product.brandMarkup,
    salesPrice: product.wholesalePrice,
    retailerMarkup: product.retailerMarkup,
    recommendedRetailPrice: product.recommendedRetailPrice,
  };
}

export function getPricingHistory(): PricingHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as PricingHistoryEntry[];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

export function savePricingHistory(entries: PricingHistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(entries));
}

function getChangedFields(
  before: PricingSnapshot | null,
  after: PricingSnapshot,
) {
  if (!before) {
    return Object.keys(after);
  }

  return (Object.keys(after) as Array<keyof PricingSnapshot>).filter(
    (field) => Math.abs(before[field] - after[field]) > 0.0001,
  );
}

export function recordPricingHistory(input: {
  productId: string;
  productCode: string;
  productName: string;
  action: PricingHistoryEntry["action"];
  before: PricingSnapshot | null;
  after: PricingSnapshot;
  changedBy?: string;
}) {
  const changedFields = getChangedFields(input.before, input.after);

  if (input.before && changedFields.length === 0) {
    return null;
  }

  const entry: PricingHistoryEntry = {
    id: createId(),
    productId: input.productId,
    productCode: input.productCode,
    productName: input.productName,
    action: input.action,
    changedBy: input.changedBy || "Daan",
    createdAt: new Date().toISOString(),
    before: input.before,
    after: input.after,
    changedFields,
  };

  savePricingHistory([entry, ...getPricingHistory()].slice(0, 1000));
  return entry;
}

export function getPricingHistoryForProduct(productId: string) {
  return getPricingHistory()
    .filter((entry) => entry.productId === productId)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}
