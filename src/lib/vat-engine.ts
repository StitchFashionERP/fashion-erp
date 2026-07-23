"use client";

export type VatTransactionType =
  | "Inkoop"
  | "Verkoop"
  | "Beide";

export type VatPriceType =
  | "Exclusief"
  | "Inclusief"
  | "Btw 0%"
  | "Geen btw";

export type VatCode =
  | "0"
  | "0V"
  | "0VD"
  | "0VG"
  | "0VX"
  | "1"
  | "1V"
  | "1VD"
  | "1VG"
  | "2"
  | "2D"
  | "2V"
  | "2VD"
  | "2VG"
  | "3V"
  | "4V"
  | "5V"
  | "G";

export type CustomerType =
  | "Zakelijk"
  | "Particulier";

export type VatNumberStatus =
  | "Niet gecontroleerd"
  | "Geldig"
  | "Ongeldig";

export type VatCodeDefinition = {
  code: VatCode;
  description: string;
  percentage: number;
  priceType: VatPriceType;
  transactionType: VatTransactionType;
};

export type VatCustomerProfile = {
  country?: string;
  customerType?: CustomerType;
  vatNumber?: string;
  vatNumberStatus?: VatNumberStatus;
  transactionNature?: "Goederen" | "Diensten";
};

export type VatResolution = {
  vatCode: VatCode;
  percentage: number;
  description: string;
  reverseCharge: boolean;
  invoiceText: string;
};

export const vatCodes: VatCodeDefinition[] = [
  {
    code: "0",
    description: "0% BTW inkopen NL",
    percentage: 0,
    priceType: "Btw 0%",
    transactionType: "Beide",
  },
  {
    code: "0V",
    description: "0% BTW verkopen NL",
    percentage: 0,
    priceType: "Btw 0%",
    transactionType: "Beide",
  },
  {
    code: "0VD",
    description: "0% BTW verkopen diensten EU",
    percentage: 0,
    priceType: "Btw 0%",
    transactionType: "Beide",
  },
  {
    code: "0VG",
    description: "0% BTW verkopen goederen EU",
    percentage: 0,
    priceType: "Btw 0%",
    transactionType: "Beide",
  },
  {
    code: "0VX",
    description: "0% BTW verkopen buiten EU",
    percentage: 0,
    priceType: "Geen btw",
    transactionType: "Verkoop",
  },
  {
    code: "1",
    description: "9% BTW inkopen NL",
    percentage: 9,
    priceType: "Exclusief",
    transactionType: "Beide",
  },
  {
    code: "1V",
    description: "9% BTW verkopen NL",
    percentage: 9,
    priceType: "Exclusief",
    transactionType: "Beide",
  },
  {
    code: "1VD",
    description: "9% BTW verkopen diensten EU",
    percentage: 9,
    priceType: "Exclusief",
    transactionType: "Verkoop",
  },
  {
    code: "1VG",
    description: "9% BTW verkopen goederen EU",
    percentage: 9,
    priceType: "Exclusief",
    transactionType: "Verkoop",
  },
  {
    code: "2",
    description: "21% BTW inkopen NL",
    percentage: 21,
    priceType: "Exclusief",
    transactionType: "Beide",
  },
  {
    code: "2D",
    description: "BTW inkopen en levering in EU landen 19%",
    percentage: 19,
    priceType: "Inclusief",
    transactionType: "Beide",
  },
  {
    code: "2V",
    description: "21% BTW verkopen NL",
    percentage: 21,
    priceType: "Exclusief",
    transactionType: "Verkoop",
  },
  {
    code: "2VD",
    description: "21% BTW verkopen diensten EU",
    percentage: 21,
    priceType: "Exclusief",
    transactionType: "Verkoop",
  },
  {
    code: "2VG",
    description: "21% BTW verkopen goederen EU",
    percentage: 21,
    priceType: "Exclusief",
    transactionType: "Verkoop",
  },
  {
    code: "3V",
    description: "Privé 12%",
    percentage: 12,
    priceType: "Exclusief",
    transactionType: "Beide",
  },
  {
    code: "4V",
    description: "Privé 21%",
    percentage: 21,
    priceType: "Exclusief",
    transactionType: "Beide",
  },
  {
    code: "5V",
    description: "Prive 21%",
    percentage: 21,
    priceType: "Exclusief",
    transactionType: "Beide",
  },
  {
    code: "G",
    description: "Geen btw",
    percentage: 0,
    priceType: "Geen btw",
    transactionType: "Verkoop",
  },
];

export const articleVatCodes: VatCodeDefinition[] =
  vatCodes.filter((item) =>
    ["2V", "1V", "0V", "G"].includes(item.code),
  );

const euCountries = new Set([
  "belgië",
  "belgie",
  "bulgarije",
  "cyprus",
  "denemarken",
  "duitsland",
  "estland",
  "finland",
  "frankrijk",
  "griekenland",
  "hongarije",
  "ierland",
  "italië",
  "italie",
  "kroatië",
  "kroatie",
  "letland",
  "litouwen",
  "luxemburg",
  "malta",
  "nederland",
  "oostenrijk",
  "polen",
  "portugal",
  "roemenië",
  "roemenie",
  "slovenië",
  "slovenie",
  "slowakije",
  "spanje",
  "tsjechië",
  "tsjechie",
  "zweden",
]);

export const commonCountries = [
  "Nederland",
  "België",
  "Duitsland",
  "Frankrijk",
  "Italië",
  "Spanje",
  "Portugal",
  "Oostenrijk",
  "Denemarken",
  "Zweden",
  "Ierland",
  "Polen",
  "Tsjechië",
  "Verenigd Koninkrijk",
  "Zwitserland",
  "Noorwegen",
  "Verenigde Staten",
  "Canada",
  "Australië",
];

function normalizeCountry(country?: string) {
  return (country || "Nederland")
    .trim()
    .toLowerCase();
}

export function isNetherlands(country?: string) {
  const normalized = normalizeCountry(country);
  return (
    normalized === "nederland" ||
    normalized === "netherlands" ||
    normalized === "nl"
  );
}

export function isEuCountry(country?: string) {
  return euCountries.has(normalizeCountry(country));
}

export function getVatCodeDefinition(
  code: VatCode,
) {
  return (
    vatCodes.find((item) => item.code === code) ??
    vatCodes.find((item) => item.code === "2V")!
  );
}

export function validateForeignVatProfile(
  profile: VatCustomerProfile,
) {
  if (isNetherlands(profile.country)) {
    return;
  }

  if (!profile.vatNumber?.trim()) {
    throw new Error(
      "Vul bij deze buitenlandse klant eerst het buitenlandse btw-nummer in.",
    );
  }

  if (
    isEuCountry(profile.country) &&
    profile.customerType !== "Particulier" &&
    profile.vatNumberStatus !== "Geldig"
  ) {
    throw new Error(
      "Markeer het buitenlandse btw-nummer eerst als geldig voordat je 0% EU-btw toepast.",
    );
  }
}

export function resolveSalesVat(
  articleCode: VatCode,
  customer: VatCustomerProfile,
): VatResolution {
  if (isNetherlands(customer.country)) {
    const definition =
      getVatCodeDefinition(articleCode);

    return {
      vatCode: definition.code,
      percentage: definition.percentage,
      description: definition.description,
      reverseCharge: false,
      invoiceText: "",
    };
  }

  validateForeignVatProfile(customer);

  if (isEuCountry(customer.country)) {
    const services =
      customer.transactionNature === "Diensten";
    const code: VatCode = services
      ? "0VD"
      : "0VG";

    return {
      vatCode: code,
      percentage: 0,
      description:
        getVatCodeDefinition(code).description,
      reverseCharge: services,
      invoiceText: services
        ? "Btw verlegd"
        : "Intracommunautaire levering, 0% btw",
    };
  }

  return {
    vatCode: "0VX",
    percentage: 0,
    description:
      getVatCodeDefinition("0VX").description,
    reverseCharge: false,
    invoiceText: "Uitvoer buiten de EU, 0% btw",
  };
}

export function calculateVatAmount(
  subtotal: number,
  percentage: number,
) {
  return (
    Math.round(
      subtotal * (percentage / 100) * 100,
    ) / 100
  );
}

export const viesCheckUrl =
  "https://ec.europa.eu/taxation_customs/vies/";
