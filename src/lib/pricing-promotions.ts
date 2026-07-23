"use client";

export type PricingPromotion = {
  id: string;
  name: string;
  productId: string;
  variantId: string;
  customerId: string;
  priceListId: string;
  discountPercentage: number;
  fixedPrice: number;
  validFrom: string;
  validUntil: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const storageKey = "fashion-erp-pricing-promotions-v1";

function now() {
  return new Date().toISOString();
}

function id() {
  return `promotion-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function read(): PricingPromotion[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as PricingPromotion[];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

function save(items: PricingPromotion[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(items),
  );
}

export function getPricingPromotions() {
  return read().map((item) => ({
    ...item,
    discountPercentage:
      Number(item.discountPercentage) || 0,
    fixedPrice: Number(item.fixedPrice) || 0,
    priority: Number(item.priority) || 0,
    isActive: item.isActive !== false,
  }));
}

export function createPricingPromotion(
  input: Omit<
    PricingPromotion,
    "id" | "createdAt" | "updatedAt"
  >,
) {
  const timestamp = now();
  const item: PricingPromotion = {
    ...input,
    id: id(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  save([item, ...getPricingPromotions()]);
  return item;
}

export function deletePricingPromotion(idValue: string) {
  save(
    getPricingPromotions().filter(
      (item) => item.id !== idValue,
    ),
  );
}

export function resolvePromotion(input: {
  productId: string;
  variantId: string;
  customerId: string;
  priceListId: string;
  date: string;
  basePrice: number;
}) {
  const promotion = getPricingPromotions()
    .filter((item) => {
      if (!item.isActive) return false;
      if (
        item.productId &&
        item.productId !== input.productId
      ) {
        return false;
      }
      if (
        item.variantId &&
        item.variantId !== input.variantId
      ) {
        return false;
      }
      if (
        item.customerId &&
        item.customerId !== input.customerId
      ) {
        return false;
      }
      if (
        item.priceListId &&
        item.priceListId !== input.priceListId
      ) {
        return false;
      }
      if (
        item.validFrom &&
        input.date < item.validFrom
      ) {
        return false;
      }
      if (
        item.validUntil &&
        input.date > item.validUntil
      ) {
        return false;
      }
      return true;
    })
    .sort(
      (first, second) =>
        second.priority - first.priority,
    )[0];

  if (!promotion) return null;

  const unitPrice =
    promotion.fixedPrice > 0
      ? promotion.fixedPrice
      : input.basePrice *
        (1 - promotion.discountPercentage / 100);

  return {
    unitPrice:
      Math.round(Math.max(0, unitPrice) * 100) /
      100,
    promotionId: promotion.id,
    sourceLabel: `Promotie: ${promotion.name}`,
  };
}
