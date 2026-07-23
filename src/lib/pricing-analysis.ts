"use client";

import {
  getStoredProducts,
  type Product,
} from "@/lib/articles";
import {
  calculatePricing,
  getPricingHealth,
  type PricingHealthTone,
} from "@/lib/pricing-engine";
import { getPricingDefaults } from "@/lib/company-settings";

export type ProductPricingAnalysis = {
  productId: string;
  productCode: string;
  productName: string;
  collection: string;
  category: string;
  supplier: string;
  status: Product["status"];
  totalCost: number;
  salesPrice: number;
  recommendedRetailPrice: number;
  brandMarkup: number;
  retailerMarkup: number;
  ownMarginAmount: number;
  ownMarginPercentage: number;
  retailerMarginAmount: number;
  retailerMarginPercentage: number;
  healthTone: PricingHealthTone;
  healthLabel: string;
  warnings: string[];
};

export type PricingPortfolioSummary = {
  articleCount: number;
  healthyCount: number;
  warningCount: number;
  dangerCount: number;
  incompleteCount: number;
  averageCost: number;
  averageSalesPrice: number;
  averageRetailPrice: number;
  averageBrandMarkup: number;
  averageRetailerMarkup: number;
  averageOwnMarginPercentage: number;
  averageRetailerMarginPercentage: number;
  totalPotentialOwnMargin: number;
};

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function ratio(value: number) {
  return Math.round(value * 100) / 100;
}

export function analyzeProductPricing(
  product: Product,
): ProductPricingAnalysis {
  const pricing = calculatePricing(
    {
      supplierPurchasePrice: product.purchasePrice,
      shippingCosts: product.shippingCosts,
      otherCosts: product.otherCosts,
      brandMarkup: product.brandMarkup,
      salesPrice: product.wholesalePrice,
      retailerMarkup: product.retailerMarkup,
      recommendedRetailPrice:
        product.recommendedRetailPrice,
    },
    "sales-price",
  );

  const normalized = calculatePricing(
    {
      supplierPurchasePrice: product.purchasePrice,
      shippingCosts: product.shippingCosts,
      otherCosts: product.otherCosts,
      salesPrice: pricing.salesPrice,
      recommendedRetailPrice:
        product.recommendedRetailPrice,
    },
    "retail-price",
  );

  const health = getPricingHealth(normalized);

  return {
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    collection: product.collection,
    category: product.category,
    supplier: product.supplier,
    status: product.status,
    totalCost: normalized.totalCost,
    salesPrice: normalized.salesPrice,
    recommendedRetailPrice:
      normalized.recommendedRetailPrice,
    brandMarkup: normalized.brandMarkup,
    retailerMarkup: normalized.retailerMarkup,
    ownMarginAmount: normalized.ownMarginAmount,
    ownMarginPercentage:
      normalized.ownMarginPercentage,
    retailerMarginAmount:
      normalized.retailerMarginAmount,
    retailerMarginPercentage:
      normalized.retailerMarginPercentage,
    healthTone: health.tone,
    healthLabel: health.label,
    warnings: health.messages,
  };
}

export function getPricingPortfolioAnalysis() {
  return getStoredProducts().map(analyzeProductPricing);
}

export function getPricingPortfolioSummary(
  rows: ProductPricingAnalysis[],
): PricingPortfolioSummary {
  const complete = rows.filter((row) => row.totalCost > 0);

  return {
    articleCount: rows.length,
    healthyCount: rows.filter(
      (row) => row.healthTone === "success",
    ).length,
    warningCount: rows.filter(
      (row) => row.healthTone === "warning",
    ).length,
    dangerCount: rows.filter(
      (row) => row.healthTone === "danger",
    ).length,
    incompleteCount: rows.filter(
      (row) => row.healthTone === "neutral",
    ).length,
    averageCost: money(
      average(complete.map((row) => row.totalCost)),
    ),
    averageSalesPrice: money(
      average(complete.map((row) => row.salesPrice)),
    ),
    averageRetailPrice: money(
      average(
        complete.map(
          (row) => row.recommendedRetailPrice,
        ),
      ),
    ),
    averageBrandMarkup: ratio(
      average(complete.map((row) => row.brandMarkup)),
    ),
    averageRetailerMarkup: ratio(
      average(
        complete.map((row) => row.retailerMarkup),
      ),
    ),
    averageOwnMarginPercentage: ratio(
      average(
        complete.map(
          (row) => row.ownMarginPercentage,
        ),
      ),
    ),
    averageRetailerMarginPercentage: ratio(
      average(
        complete.map(
          (row) => row.retailerMarginPercentage,
        ),
      ),
    ),
    totalPotentialOwnMargin: money(
      complete.reduce(
        (sum, row) => sum + row.ownMarginAmount,
        0,
      ),
    ),
  };
}

export function calculatePricingScenario(input: {
  supplierPurchasePrice: number;
  shippingCosts: number;
  otherCosts: number;
  brandMarkup: number;
  retailerMarkup: number;
  costChangePercentage: number;
}) {
  const defaults = getPricingDefaults();
  const costFactor =
    1 + input.costChangePercentage / 100;

  const current = calculatePricing(
    {
      supplierPurchasePrice:
        input.supplierPurchasePrice,
      shippingCosts: input.shippingCosts,
      otherCosts: input.otherCosts,
      brandMarkup: input.brandMarkup,
      retailerMarkup: input.retailerMarkup,
    },
    "targets",
    defaults,
  );

  const scenario = calculatePricing(
    {
      supplierPurchasePrice:
        input.supplierPurchasePrice * costFactor,
      shippingCosts: input.shippingCosts * costFactor,
      otherCosts: input.otherCosts * costFactor,
      brandMarkup: input.brandMarkup,
      retailerMarkup: input.retailerMarkup,
    },
    "targets",
    defaults,
  );

  return {
    current,
    scenario,
    salesPriceDifference: money(
      scenario.salesPrice - current.salesPrice,
    ),
    retailPriceDifference: money(
      scenario.recommendedRetailPrice -
        current.recommendedRetailPrice,
    ),
  };
}

export function exportPricingAnalysisCsv(
  rows: ProductPricingAnalysis[],
) {
  const columns = [
    "Artikelcode",
    "Artikel",
    "Collectie",
    "Categorie",
    "Leverancier",
    "Kostprijs",
    "Verkoopprijs excl. btw",
    "Adviesverkoopprijs incl. btw",
    "Merk-markup",
    "Retailer-markup",
    "Eigen marge %",
    "Retailermarge %",
    "Prijsstatus",
  ];

  const escape = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;

  const content = [
    columns.map(escape).join(";"),
    ...rows.map((row) =>
      [
        row.productCode,
        row.productName,
        row.collection,
        row.category,
        row.supplier,
        row.totalCost,
        row.salesPrice,
        row.recommendedRetailPrice,
        row.brandMarkup,
        row.retailerMarkup,
        row.ownMarginPercentage,
        row.retailerMarginPercentage,
        row.healthLabel,
      ]
        .map(escape)
        .join(";"),
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff", content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prijsanalyse-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
