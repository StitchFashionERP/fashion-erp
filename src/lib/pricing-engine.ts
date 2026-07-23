"use client";

import {
  getPricingDefaults,
  roundCommercialPrice,
  type PricingDefaults,
} from "@/lib/company-settings";

export type PricingValues = {
  supplierPurchasePrice: number;
  shippingCosts: number;
  otherCosts: number;
  totalCost: number;
  brandMarkup: number;
  salesPrice: number;
  ownMarginAmount: number;
  ownMarginPercentage: number;
  retailerMarkup: number;
  recommendedRetailPrice: number;
  recommendedRetailPriceExVat: number;
  retailerMarginAmount: number;
  retailerMarginPercentage: number;
  vatPercentage: number;
};

export type PricingInput = {
  supplierPurchasePrice: number;
  shippingCosts?: number;
  otherCosts?: number;
  brandMarkup?: number;
  salesPrice?: number;
  retailerMarkup?: number;
  recommendedRetailPrice?: number;
};

export type PricingDriver =
  | "targets"
  | "brand-markup"
  | "sales-price"
  | "retailer-markup"
  | "retail-price";

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function ratio(value: number) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function percentage(value: number) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function positiveOrFallback(
  value: number | undefined,
  fallback: number,
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : fallback;
}

export function calculatePricing(
  input: PricingInput,
  source: PricingDriver = "targets",
  defaults: PricingDefaults = getPricingDefaults(),
): PricingValues {
  const vatPercentage = defaults.vatPercentage;
  const vatFactor = 1 + vatPercentage / 100;

  const supplierPurchasePrice = Math.max(
    0,
    safeNumber(input.supplierPurchasePrice),
  );
  const shippingCosts = Math.max(
    0,
    safeNumber(input.shippingCosts),
  );
  const otherCosts = Math.max(
    0,
    safeNumber(input.otherCosts),
  );
  const totalCost = money(
    supplierPurchasePrice + shippingCosts + otherCosts,
  );

  let brandMarkup = Math.max(
    0,
    positiveOrFallback(
      input.brandMarkup,
      defaults.brandMarkup,
    ),
  );
  let salesPrice = Math.max(
    0,
    safeNumber(input.salesPrice),
  );

  if (source === "sales-price") {
    brandMarkup =
      totalCost > 0 ? ratio(salesPrice / totalCost) : 0;
  } else {
    salesPrice = roundCommercialPrice(
      totalCost * brandMarkup,
      defaults.rounding,
    );
  }

  let retailerMarkup = Math.max(
    0,
    positiveOrFallback(
      input.retailerMarkup,
      defaults.retailerMarkup,
    ),
  );
  let recommendedRetailPrice = Math.max(
    0,
    safeNumber(input.recommendedRetailPrice),
  );

  if (source === "retail-price") {
    const retailPriceExVat =
      recommendedRetailPrice / vatFactor;
    retailerMarkup =
      salesPrice > 0
        ? ratio(retailPriceExVat / salesPrice)
        : 0;
  } else {
    recommendedRetailPrice = roundCommercialPrice(
      salesPrice * retailerMarkup * vatFactor,
      defaults.rounding,
    );
  }

  const recommendedRetailPriceExVat = money(
    recommendedRetailPrice / vatFactor,
  );
  const ownMarginAmount = money(salesPrice - totalCost);
  const ownMarginPercentage =
    salesPrice > 0
      ? percentage((ownMarginAmount / salesPrice) * 100)
      : 0;
  const retailerMarginAmount = money(
    recommendedRetailPriceExVat - salesPrice,
  );
  const retailerMarginPercentage =
    recommendedRetailPriceExVat > 0
      ? percentage(
          (retailerMarginAmount /
            recommendedRetailPriceExVat) *
            100,
        )
      : 0;

  return {
    supplierPurchasePrice: money(supplierPurchasePrice),
    shippingCosts: money(shippingCosts),
    otherCosts: money(otherCosts),
    totalCost,
    brandMarkup,
    salesPrice: money(salesPrice),
    ownMarginAmount,
    ownMarginPercentage,
    retailerMarkup,
    recommendedRetailPrice: money(
      recommendedRetailPrice,
    ),
    recommendedRetailPriceExVat,
    retailerMarginAmount,
    retailerMarginPercentage,
    vatPercentage,
  };
}

export function calculatePricingFromDefaults(
  input: Pick<
    PricingInput,
    "supplierPurchasePrice" | "shippingCosts" | "otherCosts"
  >,
  defaults: PricingDefaults = getPricingDefaults(),
) {
  return calculatePricing(
    {
      ...input,
      brandMarkup: defaults.brandMarkup,
      retailerMarkup: defaults.retailerMarkup,
    },
    "targets",
    defaults,
  );
}


export type PaymentConditionInput = {
  paymentDays: number;
  paymentDiscountPercentage?: number;
  paymentDiscountDays?: number;
};

export function getPaymentConditionText(
  input: PaymentConditionInput,
) {
  const paymentDays = Math.max(
    1,
    Math.floor(Number(input.paymentDays) || 30),
  );

  const discountPercentage = Math.max(
    0,
    Number(input.paymentDiscountPercentage) || 0,
  );

  const discountDays = Math.max(
    0,
    Math.floor(
      Number(input.paymentDiscountDays) || 0,
    ),
  );

  if (
    discountPercentage > 0 &&
    discountDays > 0
  ) {
    return `${discountPercentage.toLocaleString(
      "nl-NL",
    )}% betalingskorting bij betaling binnen ${discountDays} dagen, anders ${paymentDays} dagen netto`;
  }

  return `${paymentDays} dagen netto`;
}

export function calculatePaymentDiscount(
  amount: number,
  percentageValue: number,
) {
  const percentage = Math.max(
    0,
    Number(percentageValue) || 0,
  );

  const discountAmount = money(
    Math.max(0, Number(amount) || 0) *
      (percentage / 100),
  );

  return {
    percentage,
    discountAmount,
    amountAfterDiscount: money(
      Math.max(0, amount - discountAmount),
    ),
  };
}

export type PricingHealthTone = "success" | "warning" | "danger" | "neutral";

export type PricingHealth = {
  tone: PricingHealthTone;
  label: string;
  messages: string[];
  brandMarkupDifference: number;
  retailerMarkupDifference: number;
};

export function getPricingHealth(
  pricing: PricingValues,
  defaults: PricingDefaults = getPricingDefaults(),
): PricingHealth {
  const brandMarkupDifference = ratio(
    pricing.brandMarkup - defaults.brandMarkup,
  );
  const retailerMarkupDifference = ratio(
    pricing.retailerMarkup - defaults.retailerMarkup,
  );
  const messages: string[] = [];

  if (pricing.totalCost <= 0) {
    messages.push("Vul een kostprijs in om de prijsstatus te beoordelen.");
  }

  if (pricing.brandMarkup + 0.0001 < defaults.brandMarkup) {
    messages.push(
      `Merk-markup ligt ${Math.abs(brandMarkupDifference).toLocaleString("nl-NL")}× onder het target.`,
    );
  }

  if (pricing.retailerMarkup + 0.0001 < defaults.retailerMarkup) {
    messages.push(
      `Retailer-markup ligt ${Math.abs(retailerMarkupDifference).toLocaleString("nl-NL")}× onder het target.`,
    );
  }

  if (pricing.salesPrice <= pricing.totalCost && pricing.totalCost > 0) {
    messages.push("De verkoopprijs is niet hoger dan de totale kostprijs.");
  }

  if (pricing.recommendedRetailPriceExVat <= pricing.salesPrice && pricing.salesPrice > 0) {
    messages.push("De adviesverkoopprijs biedt de retailer geen positieve marge.");
  }

  if (pricing.totalCost <= 0) {
    return {
      tone: "neutral",
      label: "Onvolledig",
      messages,
      brandMarkupDifference,
      retailerMarkupDifference,
    };
  }

  if (
    pricing.salesPrice <= pricing.totalCost ||
    pricing.recommendedRetailPriceExVat <= pricing.salesPrice
  ) {
    return {
      tone: "danger",
      label: "Prijs controleren",
      messages,
      brandMarkupDifference,
      retailerMarkupDifference,
    };
  }

  if (brandMarkupDifference < 0 || retailerMarkupDifference < 0) {
    return {
      tone: "warning",
      label: "Onder target",
      messages,
      brandMarkupDifference,
      retailerMarkupDifference,
    };
  }

  return {
    tone: "success",
    label: "Targets behaald",
    messages: ["Merk- en retailer-markup voldoen aan de bedrijfsinstellingen."],
    brandMarkupDifference,
    retailerMarkupDifference,
  };
}
