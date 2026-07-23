"use client";

import { resolveScheduledArticlePrice } from "@/lib/scheduled-prices";
import { resolvePromotion } from "@/lib/pricing-promotions";

export type PriceList = {
  id: string;
  code: string;
  name: string;
  adjustmentPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PriceAgreement = {
  id: string;
  priceListId: string;
  customerId: string;
  productId: string;
  variantId: string;
  minQuantity: number;
  unitPrice: number;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedSalesPrice = {
  unitPrice: number;
  source: "customer-agreement" | "price-list-agreement" | "price-list-adjustment" | "scheduled-price" | "promotion" | "article";
  sourceLabel: string;
  agreementId: string;
};

const priceListsKey = "fashion-erp-price-lists-v1";
const agreementsKey = "fashion-erp-price-agreements-v1";

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeMoney(value: number) {
  return Math.round(Math.max(0, Number(value) || 0) * 100) / 100;
}

export const defaultPriceLists: PriceList[] = [
  {
    id: "price-list-standard",
    code: "STD",
    name: "Standaard verkoopprijzen",
    adjustmentPercentage: 0,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "price-list-partner",
    code: "PRT",
    name: "Partnerprijzen",
    adjustmentPercentage: -5,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function read<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;

  const stored = window.localStorage.getItem(key);
  if (!stored) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(stored) as T[];
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function save<T>(key: string, values: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

export function getPriceLists() {
  return read(priceListsKey, defaultPriceLists).map((item) => ({
    ...item,
    adjustmentPercentage: Number(item.adjustmentPercentage) || 0,
    isActive: item.isActive !== false,
  }));
}

export function savePriceLists(items: PriceList[]) {
  save(priceListsKey, items);
}

export function createPriceList(input: Pick<PriceList, "code" | "name" | "adjustmentPercentage">) {
  const values = getPriceLists();
  const timestamp = now();
  const item: PriceList = {
    id: id("price-list"),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    adjustmentPercentage: Number(input.adjustmentPercentage) || 0,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  savePriceLists([...values, item]);
  return item;
}

export function updatePriceList(idValue: string, changes: Partial<PriceList>) {
  const values = getPriceLists().map((item) =>
    item.id === idValue
      ? { ...item, ...changes, updatedAt: now() }
      : item,
  );
  savePriceLists(values);
  return values.find((item) => item.id === idValue) ?? null;
}

export function getPriceAgreements() {
  return read<PriceAgreement>(agreementsKey, []).map((item) => ({
    ...item,
    customerId: item.customerId || "",
    variantId: item.variantId || "",
    minQuantity: Math.max(1, Number(item.minQuantity) || 1),
    unitPrice: safeMoney(item.unitPrice),
    validFrom: item.validFrom || "",
    validUntil: item.validUntil || "",
  }));
}

export function savePriceAgreements(items: PriceAgreement[]) {
  save(agreementsKey, items);
}

export function createPriceAgreement(
  input: Omit<PriceAgreement, "id" | "createdAt" | "updatedAt">,
) {
  const values = getPriceAgreements();
  const timestamp = now();
  const item: PriceAgreement = {
    ...input,
    id: id("price-agreement"),
    minQuantity: Math.max(1, Number(input.minQuantity) || 1),
    unitPrice: safeMoney(input.unitPrice),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  savePriceAgreements([...values, item]);
  return item;
}

export function deletePriceAgreement(idValue: string) {
  savePriceAgreements(
    getPriceAgreements().filter((item) => item.id !== idValue),
  );
}

function isAgreementActive(agreement: PriceAgreement, orderDate: string) {
  if (agreement.validFrom && orderDate < agreement.validFrom) return false;
  if (agreement.validUntil && orderDate > agreement.validUntil) return false;
  return true;
}

export function resolveSalesPrice(input: {
  basePrice: number;
  customerId: string;
  priceListId: string;
  productId: string;
  variantId: string;
  quantity: number;
  orderDate?: string;
}): ResolvedSalesPrice {
  const orderDate =
    input.orderDate ||
    new Date().toISOString().slice(0, 10);

  const quantity = Math.max(
    1,
    Number(input.quantity) || 1,
  );

  const agreements = getPriceAgreements()
    .filter((agreement) => {
      if (agreement.productId !== input.productId) {
        return false;
      }

      if (
        agreement.variantId &&
        agreement.variantId !== input.variantId
      ) {
        return false;
      }

      if (agreement.minQuantity > quantity) {
        return false;
      }

      if (!isAgreementActive(agreement, orderDate)) {
        return false;
      }

      const customerMatch =
        agreement.customerId === input.customerId;

      const listMatch =
        !agreement.customerId &&
        agreement.priceListId === input.priceListId;

      return customerMatch || listMatch;
    })
    .sort((first, second) => {
      const firstCustomer = first.customerId ? 1 : 0;
      const secondCustomer = second.customerId ? 1 : 0;

      if (firstCustomer !== secondCustomer) {
        return secondCustomer - firstCustomer;
      }

      const firstVariant = first.variantId ? 1 : 0;
      const secondVariant = second.variantId ? 1 : 0;

      if (firstVariant !== secondVariant) {
        return secondVariant - firstVariant;
      }

      return second.minQuantity - first.minQuantity;
    });

  const agreement = agreements[0];

  if (agreement) {
    return {
      unitPrice: safeMoney(agreement.unitPrice),
      source: agreement.customerId
        ? "customer-agreement"
        : "price-list-agreement",
      sourceLabel: agreement.customerId
        ? `Klantprijs vanaf ${agreement.minQuantity} stuks`
        : `Prijslijststaffel vanaf ${agreement.minQuantity} stuks`,
      agreementId: agreement.id,
    };
  }

  const promotion = resolvePromotion({
    productId: input.productId,
    variantId: input.variantId,
    customerId: input.customerId,
    priceListId: input.priceListId,
    date: orderDate,
    basePrice: input.basePrice,
  });

  if (promotion) {
    return {
      unitPrice: promotion.unitPrice,
      source: "promotion",
      sourceLabel: promotion.sourceLabel,
      agreementId: promotion.promotionId,
    };
  }

  const scheduledPrice =
    resolveScheduledArticlePrice({
      productId: input.productId,
      variantId: input.variantId,
      date: orderDate,
    });

  const effectiveBasePrice =
    scheduledPrice?.salesPrice ?? input.basePrice;

  const priceList = getPriceLists().find(
    (item) => item.id === input.priceListId,
  );

  if (
    priceList &&
    priceList.adjustmentPercentage !== 0
  ) {
    return {
      unitPrice: safeMoney(
        effectiveBasePrice *
          (1 +
            priceList.adjustmentPercentage / 100),
      ),
      source: "price-list-adjustment",
      sourceLabel: scheduledPrice
        ? `${scheduledPrice.sourceLabel} + ${priceList.name} (${priceList.adjustmentPercentage.toLocaleString(
            "nl-NL",
          )}%)`
        : `${priceList.name} (${priceList.adjustmentPercentage.toLocaleString(
            "nl-NL",
          )}%)`,
      agreementId:
        scheduledPrice?.scheduleId ?? "",
    };
  }

  if (scheduledPrice) {
    return {
      unitPrice: safeMoney(
        scheduledPrice.salesPrice,
      ),
      source: "scheduled-price",
      sourceLabel: scheduledPrice.sourceLabel,
      agreementId: scheduledPrice.scheduleId,
    };
  }

  return {
    unitPrice: safeMoney(input.basePrice),
    source: "article",
    sourceLabel: "Standaard artikelprijs",
    agreementId: "",
  };
}
