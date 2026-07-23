"use client";

import {
  getStoredProducts,
  saveProducts,
  type Product,
} from "@/lib/articles";
import {
  calculatePricing,
  getPricingHealth,
} from "@/lib/pricing-engine";
import { getPricingDefaults } from "@/lib/company-settings";
import { recordPricingHistory } from "@/lib/pricing-history";

export type PricingScenario = {
  id: string;
  name: string;
  description: string;
  costChangePercentage: number;
  brandMarkup: number;
  retailerMarkup: number;
  rounding: "none" | "0.50" | "0.95" | "1.00";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ChannelPrice = {
  id: string;
  productId: string;
  channel: string;
  country: string;
  currency: string;
  exchangeRate: number;
  adjustmentPercentage: number;
  fixedPrice: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BulkPricingInput = {
  productIds: string[];
  costChangePercentage?: number;
  brandMarkup?: number;
  retailerMarkup?: number;
  salesPriceChangePercentage?: number;
  retailPriceChangePercentage?: number;
  applyCommercialRounding?: boolean;
  changedBy?: string;
};

export type PricingAdvice = {
  productId: string;
  productCode: string;
  productName: string;
  severity: "success" | "warning" | "danger";
  headline: string;
  detail: string;
  recommendedSalesPrice: number;
  recommendedRetailPrice: number;
};

const scenarioKey = "fashion-erp-pricing-scenarios-v1";
const channelPriceKey = "fashion-erp-channel-prices-v1";

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function money(value: number) {
  return Math.round(Math.max(0, Number(value) || 0) * 100) / 100;
}

function read<T>(key: string, fallback: T[] = []): T[] {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as T[];
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function save<T>(key: string, values: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

export function getPricingScenarios() {
  return read<PricingScenario>(scenarioKey);
}

export function createPricingScenario(
  input: Omit<
    PricingScenario,
    "id" | "createdAt" | "updatedAt"
  >,
) {
  const timestamp = now();
  const scenario: PricingScenario = {
    ...input,
    id: id("pricing-scenario"),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  save(scenarioKey, [scenario, ...getPricingScenarios()]);
  return scenario;
}

export function deletePricingScenario(idValue: string) {
  save(
    scenarioKey,
    getPricingScenarios().filter(
      (scenario) => scenario.id !== idValue,
    ),
  );
}

export function getChannelPrices() {
  return read<ChannelPrice>(channelPriceKey).map(
    (item) => ({
      ...item,
      exchangeRate: Number(item.exchangeRate) || 1,
      adjustmentPercentage:
        Number(item.adjustmentPercentage) || 0,
      fixedPrice: money(item.fixedPrice),
      isActive: item.isActive !== false,
    }),
  );
}

export function createChannelPrice(
  input: Omit<
    ChannelPrice,
    "id" | "createdAt" | "updatedAt"
  >,
) {
  const timestamp = now();
  const item: ChannelPrice = {
    ...input,
    id: id("channel-price"),
    exchangeRate: Number(input.exchangeRate) || 1,
    adjustmentPercentage:
      Number(input.adjustmentPercentage) || 0,
    fixedPrice: money(input.fixedPrice),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  save(channelPriceKey, [item, ...getChannelPrices()]);
  return item;
}

export function deleteChannelPrice(idValue: string) {
  save(
    channelPriceKey,
    getChannelPrices().filter(
      (item) => item.id !== idValue,
    ),
  );
}

function isDateActive(
  validFrom: string,
  validUntil: string,
  date: string,
) {
  if (validFrom && date < validFrom) return false;
  if (validUntil && date > validUntil) return false;
  return true;
}

export function resolveChannelPrice(input: {
  productId: string;
  channel: string;
  country?: string;
  date?: string;
  basePrice: number;
}) {
  const date =
    input.date || new Date().toISOString().slice(0, 10);

  const selected = getChannelPrices()
    .filter(
      (item) =>
        item.isActive &&
        item.productId === input.productId &&
        item.channel === input.channel &&
        (!item.country ||
          item.country === (input.country || "")) &&
        isDateActive(
          item.validFrom,
          item.validUntil,
          date,
        ),
    )
    .sort((first, second) =>
      second.validFrom.localeCompare(first.validFrom),
    )[0];

  if (!selected) return null;

  const calculated =
    selected.fixedPrice > 0
      ? selected.fixedPrice
      : input.basePrice *
        (1 + selected.adjustmentPercentage / 100) *
        selected.exchangeRate;

  return {
    price: money(calculated),
    currency: selected.currency,
    sourceLabel: `${selected.channel}${
      selected.country ? ` · ${selected.country}` : ""
    }`,
    channelPriceId: selected.id,
  };
}

export function applyBulkPricing(
  input: BulkPricingInput,
) {
  const products = getStoredProducts();
  const defaults = getPricingDefaults();
  const selectedIds = new Set(input.productIds);
  let updatedCount = 0;

  const updated = products.map((product) => {
    if (!selectedIds.has(product.id)) {
      return product;
    }

    const before = {
      supplierPurchasePrice: product.purchasePrice,
      shippingCosts: product.shippingCosts,
      otherCosts: product.otherCosts,
      totalCost: product.totalCost,
      brandMarkup: product.brandMarkup,
      salesPrice: product.wholesalePrice,
      retailerMarkup: product.retailerMarkup,
      recommendedRetailPrice:
        product.recommendedRetailPrice,
    };

    const supplierPurchasePrice =
      product.purchasePrice *
      (1 + (input.costChangePercentage || 0) / 100);

    let brandMarkup =
      input.brandMarkup ?? product.brandMarkup;
    let retailerMarkup =
      input.retailerMarkup ?? product.retailerMarkup;

    let pricing = calculatePricing(
      {
        supplierPurchasePrice,
        shippingCosts: product.shippingCosts,
        otherCosts: product.otherCosts,
        brandMarkup,
        retailerMarkup,
      },
      "targets",
      {
        ...defaults,
        rounding: input.applyCommercialRounding
          ? defaults.rounding
          : "none",
      },
    );

    if (input.salesPriceChangePercentage) {
      pricing = calculatePricing(
        {
          supplierPurchasePrice,
          shippingCosts: product.shippingCosts,
          otherCosts: product.otherCosts,
          salesPrice:
            pricing.salesPrice *
            (1 +
              input.salesPriceChangePercentage / 100),
          retailerMarkup,
        },
        "sales-price",
        defaults,
      );
    }

    if (input.retailPriceChangePercentage) {
      pricing = calculatePricing(
        {
          supplierPurchasePrice,
          shippingCosts: product.shippingCosts,
          otherCosts: product.otherCosts,
          salesPrice: pricing.salesPrice,
          recommendedRetailPrice:
            pricing.recommendedRetailPrice *
            (1 +
              input.retailPriceChangePercentage /
                100),
        },
        "retail-price",
        defaults,
      );
    }

    const changed: Product = {
      ...product,
      purchasePrice: pricing.supplierPurchasePrice,
      wholesalePrice: pricing.salesPrice,
      totalCost: pricing.totalCost,
      brandMarkup: pricing.brandMarkup,
      recommendedRetailPrice:
        pricing.recommendedRetailPrice,
      retailerMarkup: pricing.retailerMarkup,
      variants: product.variants.map((variant) => ({
        ...variant,
        purchasePrice: pricing.supplierPurchasePrice,
        wholesalePrice: pricing.salesPrice,
        totalCost: pricing.totalCost,
        brandMarkup: pricing.brandMarkup,
        recommendedRetailPrice:
          pricing.recommendedRetailPrice,
        retailerMarkup: pricing.retailerMarkup,
      })),
      updatedAt: now(),
    };

    recordPricingHistory({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      changedBy: input.changedBy || "Daan",
      action: "updated",
      before,
      after: {
        supplierPurchasePrice:
          changed.purchasePrice,
        shippingCosts: changed.shippingCosts,
        otherCosts: changed.otherCosts,
        totalCost: changed.totalCost,
        brandMarkup: changed.brandMarkup,
        salesPrice: changed.wholesalePrice,
        retailerMarkup: changed.retailerMarkup,
        recommendedRetailPrice:
          changed.recommendedRetailPrice,
      },
    });

    updatedCount += 1;
    return changed;
  });

  saveProducts(updated);
  return { updatedCount, products: updated };
}

export function getPricingAdvice(): PricingAdvice[] {
  const defaults = getPricingDefaults();

  return getStoredProducts().map((product) => {
    const actual = calculatePricing(
      {
        supplierPurchasePrice: product.purchasePrice,
        shippingCosts: product.shippingCosts,
        otherCosts: product.otherCosts,
        salesPrice: product.wholesalePrice,
        recommendedRetailPrice:
          product.recommendedRetailPrice,
      },
      "retail-price",
      defaults,
    );

    const target = calculatePricing(
      {
        supplierPurchasePrice: product.purchasePrice,
        shippingCosts: product.shippingCosts,
        otherCosts: product.otherCosts,
        brandMarkup: defaults.brandMarkup,
        retailerMarkup: defaults.retailerMarkup,
      },
      "targets",
      defaults,
    );

    const health = getPricingHealth(actual, defaults);

    if (health.tone === "success") {
      return {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        severity: "success",
        headline: "Prijsstructuur op target",
        detail:
          "Zowel de merk-markup als retailer-markup voldoen aan de centrale targets.",
        recommendedSalesPrice: target.salesPrice,
        recommendedRetailPrice:
          target.recommendedRetailPrice,
      };
    }

    const messages = health.messages.join(" ");

    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      severity:
        health.tone === "danger"
          ? "danger"
          : "warning",
      headline:
        health.tone === "danger"
          ? "Prijsactie noodzakelijk"
          : "Prijs verdient aandacht",
      detail:
        messages ||
        "De huidige prijs wijkt af van de ingestelde targets.",
      recommendedSalesPrice: target.salesPrice,
      recommendedRetailPrice:
        target.recommendedRetailPrice,
    };
  });
}

export function exportProfessionalPricingCsv() {
  if (typeof window === "undefined") return;

  const rows = getStoredProducts().map((product) => {
    const pricing = calculatePricing(
      {
        supplierPurchasePrice: product.purchasePrice,
        shippingCosts: product.shippingCosts,
        otherCosts: product.otherCosts,
        salesPrice: product.wholesalePrice,
        recommendedRetailPrice:
          product.recommendedRetailPrice,
      },
      "retail-price",
    );

    return [
      product.code,
      product.name,
      product.collection,
      product.purchasePrice,
      product.shippingCosts,
      product.otherCosts,
      pricing.totalCost,
      pricing.salesPrice,
      pricing.brandMarkup,
      pricing.ownMarginPercentage,
      pricing.recommendedRetailPrice,
      pricing.retailerMarkup,
      pricing.retailerMarginPercentage,
    ];
  });

  const header = [
    "Artikelcode",
    "Artikel",
    "Collectie",
    "Inkoopprijs",
    "Verzendkosten",
    "Overige kosten",
    "Totale kostprijs",
    "Verkoopprijs excl. btw",
    "Merk-markup",
    "Eigen marge %",
    "Adviesprijs incl. btw",
    "Retailer-markup",
    "Retailermarge %",
  ];

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((value) =>
          `"${String(value).replace(/"/g, '""')}"`
        )
        .join(";"),
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pricing-export-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
