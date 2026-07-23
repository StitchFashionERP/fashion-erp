"use client";

export type PriceMode =
  | "automatic"
  | "semi-automatic"
  | "manual";

export type PriceRounding =
  | "none"
  | "0.50"
  | "0.95"
  | "1.00";

export type CompanySettings = {
  company: {
    name: string;
    tradeName: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    email: string;
    phone: string;
    website: string;
    chamberOfCommerceNumber: string;
    vatNumber: string;
    iban: string;
    bic: string;
    logoDataUrl: string;
  };
  pricing: {
    brandMarkup: number;
    retailerMarkup: number;
    vatPercentage: number;
    rounding: PriceRounding;
    mode: PriceMode;
  };
  numbering: {
    articlePrefix: string;
    salesOrderPrefix: string;
    purchaseOrderPrefix: string;
    invoicePrefix: string;
    receiptPrefix: string;
  };
  documents: {
    showCompanyDetails: boolean;
    showBankDetails: boolean;
    showVatNumber: boolean;
    footerText: string;
    paymentText: string;
  };
  sales: {
    defaultPaymentDays: number;
    reserveStockOnConfirmation: boolean;
    automaticallyCreateInvoice: boolean;
  };
  purchasing: {
    defaultPaymentDays: number;
    defaultCurrency: string;
  };
};

export type PricingDefaults = CompanySettings["pricing"];

const storageKey = "fashion-erp-company-settings-v1";
export const companySettingsChangedEvent =
  "fashion-erp-company-settings-changed";

export const defaultCompanySettings: CompanySettings = {
  company: {
    name: "",
    tradeName: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Nederland",
    email: "",
    phone: "",
    website: "",
    chamberOfCommerceNumber: "",
    vatNumber: "",
    iban: "",
    bic: "",
    logoDataUrl: "",
  },
  pricing: {
    brandMarkup: 2.1,
    retailerMarkup: 2.8,
    vatPercentage: 21,
    rounding: "0.95",
    mode: "semi-automatic",
  },
  numbering: {
    articlePrefix: "ART",
    salesOrderPrefix: "V",
    purchaseOrderPrefix: "I",
    invoicePrefix: "F",
    receiptPrefix: "IO",
  },
  documents: {
    showCompanyDetails: true,
    showBankDetails: true,
    showVatNumber: true,
    footerText:
      "Dit document is gegenereerd vanuit STITCH ERP Fashion Management.",
    paymentText:
      "Gelieve het factuurbedrag binnen de afgesproken betalingstermijn te voldoen.",
  },
  sales: {
    defaultPaymentDays: 30,
    reserveStockOnConfirmation: false,
    automaticallyCreateInvoice: false,
  },
  purchasing: {
    defaultPaymentDays: 30,
    defaultCurrency: "EUR",
  },
};

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function percentage(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.min(parsed, 100)
    : fallback;
}

function mergeSettings(
  stored: Partial<CompanySettings>,
): CompanySettings {
  const pricing: Partial<CompanySettings["pricing"]> =
    stored.pricing ?? {};

  return {
    company: {
      ...defaultCompanySettings.company,
      ...(stored.company ?? {}),
    },
    pricing: {
      ...defaultCompanySettings.pricing,
      ...pricing,
      brandMarkup: positiveNumber(
        pricing.brandMarkup,
        defaultCompanySettings.pricing.brandMarkup,
      ),
      retailerMarkup: positiveNumber(
        pricing.retailerMarkup,
        defaultCompanySettings.pricing.retailerMarkup,
      ),
      vatPercentage: percentage(
        pricing.vatPercentage,
        defaultCompanySettings.pricing.vatPercentage,
      ),
    },
    numbering: {
      ...defaultCompanySettings.numbering,
      ...(stored.numbering ?? {}),
    },
    documents: {
      ...defaultCompanySettings.documents,
      ...(stored.documents ?? {}),
    },
    sales: {
      ...defaultCompanySettings.sales,
      ...(stored.sales ?? {}),
    },
    purchasing: {
      ...defaultCompanySettings.purchasing,
      ...(stored.purchasing ?? {}),
    },
  };
}

export function getCompanySettings(): CompanySettings {
  if (typeof window === "undefined") {
    return defaultCompanySettings;
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return defaultCompanySettings;
  }

  try {
    return mergeSettings(
      JSON.parse(stored) as Partial<CompanySettings>,
    );
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaultCompanySettings;
  }
}

export function getPricingDefaults(): PricingDefaults {
  return getCompanySettings().pricing;
}

export function saveCompanySettings(
  settings: CompanySettings,
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = mergeSettings(settings);

  window.localStorage.setItem(
    storageKey,
    JSON.stringify(normalized),
  );

  window.dispatchEvent(
    new CustomEvent(companySettingsChangedEvent, {
      detail: normalized,
    }),
  );
}

export function resetCompanySettings() {
  saveCompanySettings(defaultCompanySettings);
  return defaultCompanySettings;
}

export function roundCommercialPrice(
  value: number,
  rounding: PriceRounding,
) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (rounding === "none") {
    return Math.round(value * 100) / 100;
  }

  if (rounding === "1.00") {
    return Math.ceil(value);
  }

  const ending = rounding === "0.50" ? 0.5 : 0.95;
  const base = Math.floor(value);
  const candidate = base + ending;

  return (
    Math.round(
      (candidate >= value
        ? candidate
        : base + 1 + ending) * 100,
    ) / 100
  );
}
