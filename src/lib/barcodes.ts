import {
  getStoredProducts,
  type Product,
  type ProductVariant,
} from "@/lib/articles";

export type BarcodeType =
  | "EAN13"
  | "EAN8"
  | "UPC"
  | "CODE128"
  | "OTHER";

export type BarcodeKind =
  | "EAN"
  | "INTERNAL"
  | "SUPPLIER";

export type BarcodeContext =
  | "PURCHASE_RECEIPT"
  | "SALES_PICKING"
  | "STOCK_COUNT"
  | "RETURN"
  | "TRANSFER"
  | "PRODUCT_CARD"
  | "UNKNOWN";

export type VariantBarcodeSettings = {
  variantId: string;
  productId: string;

  ean: string;
  internalBarcode: string;
  supplierBarcode: string;
  barcodeType: BarcodeType;

  unitsPerPack: number;
  unitsPerCarton: number;

  createdAt: string;
  updatedAt: string;
};

export type BarcodeLookupResult = {
  barcode: string;
  barcodeKind: BarcodeKind;
  settings: VariantBarcodeSettings;
  product: Product;
  variant: ProductVariant;
};

export type BarcodeScan = {
  id: string;
  barcode: string;

  productId: string;
  variantId: string;

  productCode: string;
  productName: string;
  sku: string;
  color: string;
  size: string;

  context: BarcodeContext;

  referenceId: string;
  referenceNumber: string;

  quantity: number;

  source:
    | "SCANNER"
    | "MANUAL_BARCODE"
    | "MANUAL_SELECTION";

  scannedBy: string;
  scannedAt: string;
};

export type RegisterBarcodeInput = {
  productId: string;
  variantId: string;

  ean?: string;
  internalBarcode?: string;
  supplierBarcode?: string;
  barcodeType?: BarcodeType;

  unitsPerPack?: number;
  unitsPerCarton?: number;
};

export type RegisterBarcodeScanInput = {
  barcode?: string;

  productId: string;
  variantId: string;

  context: BarcodeContext;

  referenceId?: string;
  referenceNumber?: string;

  quantity?: number;

  source:
    | "SCANNER"
    | "MANUAL_BARCODE"
    | "MANUAL_SELECTION";

  scannedBy?: string;
};

const barcodeSettingsStorageKey =
  "fashion-erp-variant-barcodes-v1";

const barcodeScansStorageKey =
  "fashion-erp-barcode-scans-v1";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeBarcode(value?: string | null) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function getVariantRecord(
  productId: string,
  variantId: string,
) {
  const products = getStoredProducts();

  const product = products.find(
    (item) => item.id === productId,
  );

  if (!product) {
    return null;
  }

  const variant = product.variants.find(
    (item) => item.id === variantId,
  );

  if (!variant) {
    return null;
  }

  return {
    product,
    variant,
  };
}

function getVariantRecordByVariantId(
  variantId: string,
) {
  const products = getStoredProducts();

  for (const product of products) {
    const variant = product.variants.find(
      (item) => item.id === variantId,
    );

    if (variant) {
      return {
        product,
        variant,
      };
    }
  }

  return null;
}

export function isValidEan13(value: string) {
  const barcode = normalizeBarcode(value);

  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }

  const digits = barcode
    .split("")
    .map(Number);

  const checkDigit = digits[12];

  const sum = digits
    .slice(0, 12)
    .reduce((total, digit, index) => {
      return total + digit * (index % 2 === 0 ? 1 : 3);
    }, 0);

  const calculatedCheckDigit =
    (10 - (sum % 10)) % 10;

  return calculatedCheckDigit === checkDigit;
}

export function isValidEan8(value: string) {
  const barcode = normalizeBarcode(value);

  if (!/^\d{8}$/.test(barcode)) {
    return false;
  }

  const digits = barcode
    .split("")
    .map(Number);

  const checkDigit = digits[7];

  const sum = digits
    .slice(0, 7)
    .reduce((total, digit, index) => {
      return total + digit * (index % 2 === 0 ? 3 : 1);
    }, 0);

  const calculatedCheckDigit =
    (10 - (sum % 10)) % 10;

  return calculatedCheckDigit === checkDigit;
}

export function detectBarcodeType(
  value: string,
): BarcodeType {
  const barcode = normalizeBarcode(value);

  if (/^\d{13}$/.test(barcode)) {
    return "EAN13";
  }

  if (/^\d{8}$/.test(barcode)) {
    return "EAN8";
  }

  if (/^\d{12}$/.test(barcode)) {
    return "UPC";
  }

  if (/^[A-Z0-9\-_.\/]+$/.test(barcode)) {
    return "CODE128";
  }

  return "OTHER";
}

export function validateBarcode(
  value: string,
  type?: BarcodeType,
) {
  const barcode = normalizeBarcode(value);
  const detectedType =
    type ?? detectBarcodeType(barcode);

  if (!barcode) {
    return {
      valid: true,
      message: "",
    };
  }

  if (detectedType === "EAN13") {
    return {
      valid: isValidEan13(barcode),
      message: isValidEan13(barcode)
        ? ""
        : "De EAN-13 controlecode is niet geldig.",
    };
  }

  if (detectedType === "EAN8") {
    return {
      valid: isValidEan8(barcode),
      message: isValidEan8(barcode)
        ? ""
        : "De EAN-8 controlecode is niet geldig.",
    };
  }

  if (barcode.length < 3) {
    return {
      valid: false,
      message:
        "Een barcode moet minimaal 3 tekens bevatten.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function getVariantBarcodeSettings(): VariantBarcodeSettings[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(
    barcodeSettingsStorageKey,
  );

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      stored,
    ) as VariantBarcodeSettings[];

    return parsed.map((item) => ({
      ...item,
      ean: normalizeBarcode(item.ean),
      internalBarcode: normalizeBarcode(
        item.internalBarcode,
      ),
      supplierBarcode: normalizeBarcode(
        item.supplierBarcode,
      ),
      barcodeType:
        item.barcodeType ??
        detectBarcodeType(
          item.ean ||
            item.internalBarcode ||
            item.supplierBarcode,
        ),
      unitsPerPack: normalizePositiveInteger(
        item.unitsPerPack,
        1,
      ),
      unitsPerCarton: normalizePositiveInteger(
        item.unitsPerCarton,
        1,
      ),
    }));
  } catch {
    window.localStorage.removeItem(
      barcodeSettingsStorageKey,
    );

    return [];
  }
}

export function saveVariantBarcodeSettings(
  settings: VariantBarcodeSettings[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    barcodeSettingsStorageKey,
    JSON.stringify(settings),
  );
}

export function getBarcodeSettingsForVariant(
  variantId: string,
) {
  const existing = getVariantBarcodeSettings().find(
    (item) => item.variantId === variantId,
  );

  if (existing) {
    return existing;
  }

  const record =
    getVariantRecordByVariantId(variantId);

  if (!record) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    productId: record.product.id,
    variantId: record.variant.id,
    ean: normalizeBarcode(
      "ean" in record.variant
        ? String(record.variant.ean ?? "")
        : "",
    ),
    internalBarcode: "",
    supplierBarcode: "",
    barcodeType: detectBarcodeType(
      "ean" in record.variant
        ? String(record.variant.ean ?? "")
        : "",
    ),
    unitsPerPack: 1,
    unitsPerCarton: 1,
    createdAt: now,
    updatedAt: now,
  } satisfies VariantBarcodeSettings;
}

function getBarcodeOwner(
  barcode: string,
  ignoredVariantId?: string,
) {
  const normalized = normalizeBarcode(barcode);

  if (!normalized) {
    return null;
  }

  return (
    getVariantBarcodeSettings().find(
      (item) =>
        item.variantId !== ignoredVariantId &&
        [
          item.ean,
          item.internalBarcode,
          item.supplierBarcode,
        ].includes(normalized),
    ) ?? null
  );
}

export function isBarcodeAvailable(
  barcode: string,
  variantId?: string,
) {
  return !getBarcodeOwner(barcode, variantId);
}

export function registerVariantBarcodes(
  input: RegisterBarcodeInput,
) {
  const record = getVariantRecord(
    input.productId,
    input.variantId,
  );

  if (!record) {
    throw new Error(
      "De geselecteerde artikelvariant is niet gevonden.",
    );
  }

  const current =
    getBarcodeSettingsForVariant(input.variantId);

  const ean = normalizeBarcode(
    input.ean ?? current?.ean,
  );

  const internalBarcode = normalizeBarcode(
    input.internalBarcode ??
      current?.internalBarcode,
  );

  const supplierBarcode = normalizeBarcode(
    input.supplierBarcode ??
      current?.supplierBarcode,
  );

  const values = [
    {
      label: "EAN",
      value: ean,
    },
    {
      label: "Interne barcode",
      value: internalBarcode,
    },
    {
      label: "Leveranciersbarcode",
      value: supplierBarcode,
    },
  ];

  for (const item of values) {
    if (
      item.value &&
      !isBarcodeAvailable(
        item.value,
        input.variantId,
      )
    ) {
      throw new Error(
        `${item.label} ${item.value} is al gekoppeld aan een andere variant.`,
      );
    }
  }

  const duplicateWithinVariant = values
    .map((item) => item.value)
    .filter(Boolean)
    .some(
      (value, index, allValues) =>
        allValues.indexOf(value) !== index,
    );

  if (duplicateWithinVariant) {
    throw new Error(
      "De EAN, interne barcode en leveranciersbarcode moeten van elkaar verschillen.",
    );
  }

  if (ean) {
    const eanValidation = validateBarcode(
      ean,
      input.barcodeType ??
        detectBarcodeType(ean),
    );

    if (!eanValidation.valid) {
      throw new Error(eanValidation.message);
    }
  }

  const settings =
    getVariantBarcodeSettings();

  const existingIndex = settings.findIndex(
    (item) =>
      item.variantId === input.variantId,
  );

  const now = new Date().toISOString();

  const updated: VariantBarcodeSettings = {
    productId: input.productId,
    variantId: input.variantId,

    ean,
    internalBarcode,
    supplierBarcode,

    barcodeType:
      input.barcodeType ??
      current?.barcodeType ??
      detectBarcodeType(
        ean ||
          internalBarcode ||
          supplierBarcode,
      ),

    unitsPerPack: normalizePositiveInteger(
      input.unitsPerPack,
      current?.unitsPerPack ?? 1,
    ),

    unitsPerCarton: normalizePositiveInteger(
      input.unitsPerCarton,
      current?.unitsPerCarton ?? 1,
    ),

    createdAt:
      existingIndex >= 0
        ? settings[existingIndex].createdAt
        : now,

    updatedAt: now,
  };

  if (existingIndex >= 0) {
    settings[existingIndex] = updated;
  } else {
    settings.push(updated);
  }

  saveVariantBarcodeSettings(settings);

  return updated;
}

export function assignUnknownBarcodeToVariant(
  barcode: string,
  productId: string,
  variantId: string,
  kind: BarcodeKind = "SUPPLIER",
) {
  const normalized = normalizeBarcode(barcode);

  if (!normalized) {
    throw new Error(
      "De gescande barcode is leeg.",
    );
  }

  if (
    !isBarcodeAvailable(
      normalized,
      variantId,
    )
  ) {
    throw new Error(
      `Barcode ${normalized} is al gekoppeld aan een andere variant.`,
    );
  }

  const current =
    getBarcodeSettingsForVariant(variantId);

  return registerVariantBarcodes({
    productId,
    variantId,

    ean:
      kind === "EAN"
        ? normalized
        : current?.ean,

    internalBarcode:
      kind === "INTERNAL"
        ? normalized
        : current?.internalBarcode,

    supplierBarcode:
      kind === "SUPPLIER"
        ? normalized
        : current?.supplierBarcode,

    barcodeType:
      kind === "EAN"
        ? detectBarcodeType(normalized)
        : current?.barcodeType ??
          detectBarcodeType(normalized),

    unitsPerPack:
      current?.unitsPerPack ?? 1,

    unitsPerCarton:
      current?.unitsPerCarton ?? 1,
  });
}

export function lookupVariantByBarcode(
  barcode: string,
): BarcodeLookupResult | null {
  const normalized = normalizeBarcode(barcode);

  if (!normalized) {
    return null;
  }

  const settings =
    getVariantBarcodeSettings();

  const match = settings.find(
    (item) =>
      item.ean === normalized ||
      item.internalBarcode === normalized ||
      item.supplierBarcode === normalized,
  );

  if (match) {
    const record = getVariantRecord(
      match.productId,
      match.variantId,
    );

    if (!record) {
      return null;
    }

    let barcodeKind: BarcodeKind =
      "SUPPLIER";

    if (match.ean === normalized) {
      barcodeKind = "EAN";
    }

    if (
      match.internalBarcode === normalized
    ) {
      barcodeKind = "INTERNAL";
    }

    return {
      barcode: normalized,
      barcodeKind,
      settings: match,
      product: record.product,
      variant: record.variant,
    };
  }

  const products = getStoredProducts();

  for (const product of products) {
    for (const variant of product.variants) {
      const variantEan =
        "ean" in variant
          ? normalizeBarcode(
              String(variant.ean ?? ""),
            )
          : "";

      if (
        variantEan &&
        variantEan === normalized
      ) {
        const now = new Date().toISOString();

        const fallbackSettings: VariantBarcodeSettings =
          {
            productId: product.id,
            variantId: variant.id,
            ean: variantEan,
            internalBarcode: "",
            supplierBarcode: "",
            barcodeType:
              detectBarcodeType(variantEan),
            unitsPerPack: 1,
            unitsPerCarton: 1,
            createdAt: now,
            updatedAt: now,
          };

        return {
          barcode: normalized,
          barcodeKind: "EAN",
          settings: fallbackSettings,
          product,
          variant,
        };
      }
    }
  }

  return null;
}

export function searchVariantsForBarcodeAssignment(
  search: string,
) {
  const normalizedSearch = search
    .trim()
    .toLowerCase();

  if (!normalizedSearch) {
    return [];
  }

  const settings =
    getVariantBarcodeSettings();

  return getStoredProducts()
    .flatMap((product) =>
      product.variants.map((variant) => {
        const barcodeSettings =
          settings.find(
            (item) =>
              item.variantId === variant.id,
          ) ??
          getBarcodeSettingsForVariant(
            variant.id,
          );

        return {
          product,
          variant,
          settings: barcodeSettings,
        };
      }),
    )
    .filter(({ product, variant, settings }) => {
      return [
        product.name,
        product.code,
        variant.sku,
        variant.color,
        variant.size,
        settings?.ean,
        settings?.internalBarcode,
        settings?.supplierBarcode,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalizedSearch),
      );
    })
    .slice(0, 50);
}

export function getBarcodeScans() {
  if (typeof window === "undefined") {
    return [] as BarcodeScan[];
  }

  const stored = window.localStorage.getItem(
    barcodeScansStorageKey,
  );

  if (!stored) {
    return [] as BarcodeScan[];
  }

  try {
    return JSON.parse(stored) as BarcodeScan[];
  } catch {
    window.localStorage.removeItem(
      barcodeScansStorageKey,
    );

    return [] as BarcodeScan[];
  }
}

export function saveBarcodeScans(
  scans: BarcodeScan[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    barcodeScansStorageKey,
    JSON.stringify(scans),
  );
}

export function registerBarcodeScan(
  input: RegisterBarcodeScanInput,
) {
  const record = getVariantRecord(
    input.productId,
    input.variantId,
  );

  if (!record) {
    throw new Error(
      "De gescande artikelvariant is niet gevonden.",
    );
  }

  const scan: BarcodeScan = {
    id: createId("barcode-scan"),

    barcode: normalizeBarcode(
      input.barcode,
    ),

    productId: record.product.id,
    variantId: record.variant.id,

    productCode: record.product.code,
    productName: record.product.name,
    sku: record.variant.sku,
    color: record.variant.color,
    size: record.variant.size,

    context: input.context,

    referenceId:
      input.referenceId?.trim() ?? "",

    referenceNumber:
      input.referenceNumber?.trim() ?? "",

    quantity: Math.max(
      1,
      Math.floor(input.quantity ?? 1),
    ),

    source: input.source,

    scannedBy:
      input.scannedBy?.trim() || "Daan",

    scannedAt: new Date().toISOString(),
  };

  saveBarcodeScans([
    ...getBarcodeScans(),
    scan,
  ]);

  return scan;
}

export function getBarcodeScansForReference(
  context: BarcodeContext,
  referenceId: string,
) {
  return getBarcodeScans()
    .filter(
      (scan) =>
        scan.context === context &&
        scan.referenceId === referenceId,
    )
    .sort((first, second) =>
      second.scannedAt.localeCompare(
        first.scannedAt,
      ),
    );
}

export function getBarcodeScansForVariant(
  variantId: string,
) {
  return getBarcodeScans()
    .filter(
      (scan) =>
        scan.variantId === variantId,
    )
    .sort((first, second) =>
      second.scannedAt.localeCompare(
        first.scannedAt,
      ),
    );
}