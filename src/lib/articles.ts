import { getPricingDefaults } from "@/lib/company-settings";
import { calculatePricing } from "@/lib/pricing-engine";
import type { VatCode } from "@/lib/vat-engine";
import {
  getProductPricingSnapshot,
  recordPricingHistory,
} from "@/lib/pricing-history";

export type ProductStatus = "Actief" | "Concept" | "Inactief";

export type ProductVariant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  ean?: string;
  supplierVariantCode?: string;
  physicalStock: number;
  reservedStock: number;
  purchasePrice: number;
  wholesalePrice: number;
  shippingCosts: number;
  otherCosts: number;
  totalCost: number;
  brandMarkup: number;
  recommendedRetailPrice: number;
  retailerMarkup: number;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  collection: string;
  category: string;
  supplier: string;
  status: ProductStatus;
  vatCode: VatCode;

  brand: string;
  material: string;
  garmentType: string;
  fit: string;
  colorFamily: string;
  seasonType:
    | "Voorjaar/Zomer"
    | "Herfst/Winter"
    | "Doorlopend";
  countryOfOrigin: string;
  description: string;

  purchasePrice: number;
  wholesalePrice: number;
  shippingCosts: number;
  otherCosts: number;
  totalCost: number;
  brandMarkup: number;
  recommendedRetailPrice: number;
  retailerMarkup: number;

  colors: string[];
  sizes: string[];
  variants: ProductVariant[];

  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  code: string;
  name: string;
  collection: string;
  category: string;
  supplier: string;
  status: ProductStatus;
  vatCode: VatCode;

  brand: string;
  material: string;
  garmentType: string;
  fit: string;
  colorFamily: string;
  seasonType:
    | "Voorjaar/Zomer"
    | "Herfst/Winter"
    | "Doorlopend";
  countryOfOrigin: string;
  description: string;

  purchasePrice: number;
  wholesalePrice: number;
  shippingCosts: number;
  otherCosts: number;
  totalCost: number;
  brandMarkup: number;
  recommendedRetailPrice: number;
  retailerMarkup: number;

  colors: string[];
  sizes: string[];

  stockByVariant?: Record<string, number>;
  importedVariants?: Array<{
    color: string;
    size: string;
    stock?: number;
    ean?: string;
    supplierVariantCode?: string;
  }>;
};

const storageKey = "fashion-erp-products-v3";
const previousStorageKey = "fashion-erp-products-v2";
const legacyStorageKey = "fashion-erp-products";
const pricingMigrationKey = "fashion-erp-products-pricing-migration-v1";

function cleanCodePart(value: string, maxLength = 5) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, maxLength);
}

export function generateArticleNumber({
  brandCode,
  seasonCode,
  year,
  productTypeCode,
}: {
  brandCode: string;
  seasonCode: string;
  year: number;
  productTypeCode: string;
}) {
  const prefix = `${cleanCodePart(brandCode, 2)}${cleanCodePart(seasonCode, 1)}${String(year).slice(-2)}${cleanCodePart(productTypeCode, 2).padStart(2, "0")}`;
  const existing = getStoredProducts()
    .map((product) => product.code)
    .filter((code) => code.startsWith(prefix))
    .map((code) => Number(code.slice(prefix.length)))
    .filter((value) => Number.isFinite(value));
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function getVariantKey(color: string, size: string) {
  return `${color}__${size}`;
}

export function generateSku(
  collection: string,
  productCode: string,
  color: string,
  size: string,
) {
  return [
    cleanCodePart(collection, 5),
    cleanCodePart(productCode, 10),
    cleanCodePart(color, 4),
    cleanCodePart(size, 4),
  ]
    .filter(Boolean)
    .join("-");
}

export function createProductId(name: string, code: string) {
  const slug = `${name}-${code}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug}-${Date.now()}`;
}

export function generateVariants(
  input: ProductInput,
  existingVariants: ProductVariant[] = [],
): ProductVariant[] {
  const existingByKey = new Map(
    existingVariants.map((variant) => [
      getVariantKey(variant.color, variant.size),
      variant,
    ]),
  );

  const requestedVariants: NonNullable<ProductInput["importedVariants"]> =
    input.importedVariants?.length
      ? input.importedVariants
      : input.colors.flatMap((color) =>
          input.sizes.map((size) => ({
            color,
            size,
            stock: undefined,
            ean: undefined,
            supplierVariantCode: undefined,
          })),
        );

  return requestedVariants.map((requested) => {
    const color = requested.color;
    const size = requested.size;
    const key = getVariantKey(color, size);
    const existing = existingByKey.get(key);

    return {
      id: existing?.id ?? `${key}-${Date.now()}-${Math.random()}`,
      sku: generateSku(
        input.collection,
        input.code,
        color,
        size,
      ),
      color,
      size,
      ean: requested.ean || existing?.ean,
      supplierVariantCode:
        requested.supplierVariantCode ||
        existing?.supplierVariantCode,
      physicalStock:
        requested.stock ??
        input.stockByVariant?.[key] ??
        existing?.physicalStock ??
        0,
      reservedStock: existing?.reservedStock ?? 0,
      purchasePrice: input.purchasePrice,
      wholesalePrice: input.wholesalePrice,
      shippingCosts: input.shippingCosts,
      otherCosts: input.otherCosts,
      totalCost: input.totalCost,
      brandMarkup: input.brandMarkup,
      recommendedRetailPrice: input.recommendedRetailPrice,
      retailerMarkup: input.retailerMarkup,
    };
  });
}

function makeDefaultProduct(
  partial: Omit<ProductInput, "stockByVariant" | "shippingCosts" | "otherCosts" | "totalCost" | "brandMarkup" | "recommendedRetailPrice" | "retailerMarkup" | "vatCode" | "garmentType" | "fit" | "colorFamily" | "seasonType"> & Partial<Pick<ProductInput, "shippingCosts" | "otherCosts" | "totalCost" | "brandMarkup" | "recommendedRetailPrice" | "retailerMarkup" | "vatCode" | "garmentType" | "fit" | "colorFamily" | "seasonType">> & {
    id: string;
    stockByVariant?: Record<string, number>;
  },
): Product {
  const now = new Date().toISOString();

  const input: ProductInput = {
    code: partial.code,
    name: partial.name,
    collection: partial.collection,
    category: partial.category,
    supplier: partial.supplier,
    status: partial.status,
    vatCode: partial.vatCode ?? "2V",
    brand: partial.brand,
    material: partial.material,
    garmentType:
      partial.garmentType ||
      partial.category ||
      "",
    fit: partial.fit || "",
    colorFamily:
      partial.colorFamily || "",
    seasonType:
      partial.seasonType || "Doorlopend",
    countryOfOrigin: partial.countryOfOrigin,
    description: partial.description,
    purchasePrice: partial.purchasePrice,
    wholesalePrice: partial.wholesalePrice,
    shippingCosts: partial.shippingCosts ?? 0,
    otherCosts: partial.otherCosts ?? 0,
    totalCost: partial.totalCost ?? partial.purchasePrice,
    brandMarkup: partial.brandMarkup ?? (partial.purchasePrice > 0 ? partial.wholesalePrice / partial.purchasePrice : 0),
    recommendedRetailPrice: partial.recommendedRetailPrice ?? 0,
    retailerMarkup:
      partial.retailerMarkup ??
      getPricingDefaults().retailerMarkup,
    colors: partial.colors,
    sizes: partial.sizes,
    stockByVariant: partial.stockByVariant,
  };

  return {
    id: partial.id,
    ...input,
    variants: generateVariants(input),
    createdAt: now,
    updatedAt: now,
  };
}

export const defaultProducts: Product[] = [
  makeDefaultProduct({
    id: "olivia-blouse",
    code: "BL1001",
    name: "Olivia Blouse",
    collection: "AW27",
    category: "Blouses",
    supplier: "Milano Textile Group",
    status: "Actief",
    brand: "Demo Fashion",
    material: "70% viscose, 30% linnen",
    countryOfOrigin: "Italië",
    description:
      "Lichtvallende blouse met klassieke kraag en een ontspannen pasvorm.",
    purchasePrice: 21.5,
    wholesalePrice: 42.5,
    colors: ["Beige", "Navy", "Zwart"],
    sizes: ["XS", "S", "M", "L", "XL"],
    stockByVariant: {
      [getVariantKey("Beige", "XS")]: 8,
      [getVariantKey("Beige", "S")]: 14,
      [getVariantKey("Beige", "M")]: 18,
      [getVariantKey("Beige", "L")]: 11,
      [getVariantKey("Beige", "XL")]: 5,
      [getVariantKey("Navy", "XS")]: 6,
      [getVariantKey("Navy", "S")]: 12,
      [getVariantKey("Navy", "M")]: 16,
      [getVariantKey("Navy", "L")]: 9,
      [getVariantKey("Navy", "XL")]: 4,
      [getVariantKey("Zwart", "XS")]: 3,
      [getVariantKey("Zwart", "S")]: 7,
      [getVariantKey("Zwart", "M")]: 8,
      [getVariantKey("Zwart", "L")]: 4,
      [getVariantKey("Zwart", "XL")]: 1,
    },
  }),

  makeDefaultProduct({
    id: "emma-jacket",
    code: "JK2003",
    name: "Emma Jacket",
    collection: "AW27",
    category: "Jassen",
    supplier: "Porto Garments",
    status: "Actief",
    brand: "Demo Fashion",
    material: "55% wol, 45% polyester",
    countryOfOrigin: "Portugal",
    description:
      "Klassieke korte jas met een moderne rechte pasvorm.",
    purchasePrice: 39.5,
    wholesalePrice: 79.95,
    colors: ["Camel", "Zwart"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  }),

  makeDefaultProduct({
    id: "basic-tee",
    code: "TS9001",
    name: "Basic Tee",
    collection: "Core",
    category: "T-shirts",
    supplier: "Nordic Fashion Supply",
    status: "Actief",
    brand: "Demo Fashion",
    material: "100% biologisch katoen",
    countryOfOrigin: "Turkije",
    description:
      "Basis T-shirt met ronde hals en een comfortabele pasvorm.",
    purchasePrice: 8.25,
    wholesalePrice: 18.5,
    colors: ["Wit", "Zwart", "Navy", "Grijs"],
    sizes: ["XS", "S", "M", "L", "XL"],
  }),

  makeDefaultProduct({
    id: "noa-trousers",
    code: "TR4012",
    name: "Noa Trousers",
    collection: "SS27",
    category: "Broeken",
    supplier: "Milano Textile Group",
    status: "Concept",
    brand: "Demo Fashion",
    material: "65% viscose, 30% nylon, 5% elastaan",
    countryOfOrigin: "Italië",
    description:
      "Getailleerde broek met hoge taille en rechte pijpen.",
    purchasePrice: 27.5,
    wholesalePrice: 54.95,
    colors: ["Beige", "Navy", "Zwart"],
    sizes: ["34", "36", "38", "40", "42", "44"],
  }),

  makeDefaultProduct({
    id: "liva-dress",
    code: "DR3024",
    name: "Liva Dress",
    collection: "SS26",
    category: "Jurken",
    supplier: "Porto Garments",
    status: "Inactief",
    brand: "Demo Fashion",
    material: "100% viscose",
    countryOfOrigin: "Portugal",
    description:
      "Midi-jurk met een vrouwelijke taille en vloeiende rok.",
    purchasePrice: 31.5,
    wholesalePrice: 64.5,
    colors: ["Rood", "Zwart"],
    sizes: ["XS", "S", "M", "L", "XL"],
  }),
];

function normalizeLegacyProduct(
  product: Record<string, unknown>,
): Product {
  const now = new Date().toISOString();
  const defaults = getPricingDefaults();

  const colors = Array.isArray(product.colors)
    ? (product.colors as string[])
    : [];

  const sizes = Array.isArray(product.sizes)
    ? (product.sizes as string[])
    : [];

  const purchasePrice = Number(
    product.purchasePrice ?? 0,
  );
  const shippingCosts = Number(
    product.shippingCosts ?? 0,
  );
  const otherCosts = Number(product.otherCosts ?? 0);
  const storedSalesPrice = Number(
    product.wholesalePrice ?? product.salesPrice ?? 0,
  );
  const storedRetailPrice = Number(
    product.recommendedRetailPrice ?? 0,
  );
  const storedBrandMarkup = Number(
    product.brandMarkup ?? 0,
  );
  const storedRetailerMarkup = Number(
    product.retailerMarkup ?? 0,
  );

  const basePricing = calculatePricing(
    {
      supplierPurchasePrice: purchasePrice,
      shippingCosts,
      otherCosts,
      brandMarkup:
        storedBrandMarkup > 0
          ? storedBrandMarkup
          : defaults.brandMarkup,
      retailerMarkup:
        storedRetailerMarkup > 0
          ? storedRetailerMarkup
          : defaults.retailerMarkup,
    },
    "targets",
    defaults,
  );

  const salesPricing =
    storedSalesPrice > 0
      ? calculatePricing(
          {
            supplierPurchasePrice: purchasePrice,
            shippingCosts,
            otherCosts,
            salesPrice: storedSalesPrice,
            retailerMarkup:
              storedRetailerMarkup > 0
                ? storedRetailerMarkup
                : defaults.retailerMarkup,
          },
          "sales-price",
          defaults,
        )
      : basePricing;

  const finalPricing =
    storedRetailPrice > 0
      ? calculatePricing(
          {
            supplierPurchasePrice: purchasePrice,
            shippingCosts,
            otherCosts,
            salesPrice: salesPricing.salesPrice,
            recommendedRetailPrice: storedRetailPrice,
          },
          "retail-price",
          defaults,
        )
      : salesPricing;

  const input: ProductInput = {
    code: String(product.code ?? ""),
    name: String(product.name ?? ""),
    collection: String(product.collection ?? ""),
    category: String(product.category ?? ""),
    supplier: String(product.supplier ?? ""),
    status:
      (product.status as ProductStatus | undefined) ??
      "Concept",
    vatCode: (product.vatCode as VatCode | undefined) ?? "2V",
    garmentType: String(product.garmentType ?? product.category ?? ""),
    fit: String(product.fit ?? ""),
    colorFamily: String(product.colorFamily ?? ""),
    seasonType: ((product.seasonType as ProductInput["seasonType"] | undefined) ?? "Doorlopend"),
    brand: String(product.brand ?? "Demo Fashion"),
    material: String(product.material ?? ""),
    countryOfOrigin: String(
      product.countryOfOrigin ?? "",
    ),
    description: String(product.description ?? ""),
    purchasePrice: finalPricing.supplierPurchasePrice,
    wholesalePrice: finalPricing.salesPrice,
    shippingCosts: finalPricing.shippingCosts,
    otherCosts: finalPricing.otherCosts,
    totalCost: finalPricing.totalCost,
    brandMarkup: finalPricing.brandMarkup,
    recommendedRetailPrice:
      finalPricing.recommendedRetailPrice,
    retailerMarkup: finalPricing.retailerMarkup,
    colors,
    sizes,
  };

  const storedVariants = Array.isArray(product.variants)
    ? (product.variants as Record<string, unknown>[]).map(
        (variant) => ({
          id: String(variant.id ?? ""),
          sku: String(variant.sku ?? ""),
          color: String(variant.color ?? ""),
          size: String(variant.size ?? ""),
          physicalStock: Number(
            variant.physicalStock ?? 0,
          ),
          reservedStock: Number(
            variant.reservedStock ?? 0,
          ),
          purchasePrice: input.purchasePrice,
          wholesalePrice: input.wholesalePrice,
          shippingCosts: input.shippingCosts,
          otherCosts: input.otherCosts,
          totalCost: input.totalCost,
          brandMarkup: input.brandMarkup,
          recommendedRetailPrice:
            input.recommendedRetailPrice,
          retailerMarkup: input.retailerMarkup,
        }),
      )
    : [];

  const generatedVariants = generateVariants(
    input,
    storedVariants,
  );
  const legacyStock = Number(product.stock ?? 0);

  if (
    storedVariants.length === 0 &&
    generatedVariants.length > 0 &&
    legacyStock > 0
  ) {
    generatedVariants[0].physicalStock = legacyStock;
  }

  return {
    id: String(
      product.id ?? createProductId(input.name, input.code),
    ),
    ...input,
    variants: generatedVariants,
    createdAt: String(product.createdAt ?? now),
    updatedAt: String(product.updatedAt ?? now),
  };
}

export type PricingMigrationResult = {
  migratedProducts: number;
  totalProducts: number;
};

export function migrateProductsToPricingSettings(
  force = false,
): PricingMigrationResult {
  if (typeof window === "undefined") {
    return { migratedProducts: 0, totalProducts: 0 };
  }

  if (
    !force &&
    window.localStorage.getItem(pricingMigrationKey) ===
      "done"
  ) {
    const products = getStoredProducts();
    return {
      migratedProducts: 0,
      totalProducts: products.length,
    };
  }

  const products = getStoredProducts();
  let migratedProducts = 0;

  const migrated = products.map((product) => {
    const normalized = normalizeLegacyProduct(
      product as unknown as Record<string, unknown>,
    );

    const changed =
      normalized.totalCost !== product.totalCost ||
      normalized.brandMarkup !== product.brandMarkup ||
      normalized.retailerMarkup !==
        product.retailerMarkup ||
      normalized.recommendedRetailPrice !==
        product.recommendedRetailPrice;

    if (changed) {
      migratedProducts += 1;
    }

    return normalized;
  });

  saveProducts(migrated);
  window.localStorage.setItem(pricingMigrationKey, "done");

  return {
    migratedProducts,
    totalProducts: migrated.length,
  };
}

export function getStoredProducts(): Product[] {
  if (typeof window === "undefined") {
    return defaultProducts.map((product) => ({
      ...product,
      vatCode: product.vatCode || "2V",
      garmentType:
        product.garmentType ||
        product.category ||
        "",
      fit: product.fit || "",
      colorFamily:
        product.colorFamily || "",
      seasonType:
        product.seasonType ||
        "Doorlopend",
    }));
  }

  const stored = window.localStorage.getItem(storageKey);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>[];
      const normalized = parsed.map(normalizeLegacyProduct);
      saveProducts(normalized);
      return normalized;
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }

  const previousStored =
    window.localStorage.getItem(previousStorageKey);

  if (previousStored) {
    try {
      const previousProducts = JSON.parse(
        previousStored,
      ) as Record<string, unknown>[];

      const migratedProducts = previousProducts.map(
        normalizeLegacyProduct,
      );

      saveProducts(migratedProducts);
      window.localStorage.setItem(
        pricingMigrationKey,
        "done",
      );
      return migratedProducts;
    } catch {
      window.localStorage.removeItem(previousStorageKey);
    }
  }

  const legacyStored =
    window.localStorage.getItem(legacyStorageKey);

  if (legacyStored) {
    try {
      const legacyProducts = JSON.parse(
        legacyStored,
      ) as Record<string, unknown>[];

      const migratedProducts = legacyProducts.map(
        normalizeLegacyProduct,
      );

      saveProducts(migratedProducts);
      return migratedProducts;
    } catch {
      window.localStorage.removeItem(legacyStorageKey);
    }
  }

  saveProducts(defaultProducts);
  return defaultProducts;
}

export function saveProducts(products: Product[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify(products),
  );
}

export function getProductById(id: string) {
  return (
    getStoredProducts().find(
      (product) => product.id === id,
    ) ?? null
  );
}

export function addProduct(input: ProductInput) {
  const now = new Date().toISOString();

  const product: Product = {
    id: createProductId(input.name, input.code),
    ...input,
    variants: generateVariants(input),
    createdAt: now,
    updatedAt: now,
  };

  const products = getStoredProducts();
  saveProducts([...products, product]);

  recordPricingHistory({
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    action: "created",
    before: null,
    after: getProductPricingSnapshot(product),
  });

  return product;
}

export function updateProduct(
  id: string,
  input: ProductInput,
) {
  const products = getStoredProducts();
  const current = products.find(
    (product) => product.id === id,
  );

  if (!current) {
    throw new Error("Artikel niet gevonden.");
  }

  const updated: Product = {
    ...current,
    ...input,
    variants: generateVariants(
      input,
      current.variants,
    ),
    updatedAt: new Date().toISOString(),
  };

  saveProducts(
    products.map((product) =>
      product.id === id ? updated : product,
    ),
  );

  recordPricingHistory({
    productId: updated.id,
    productCode: updated.code,
    productName: updated.name,
    action: "updated",
    before: getProductPricingSnapshot(current),
    after: getProductPricingSnapshot(updated),
  });

  return updated;
}


export type BulkProductUpdate = {
  material?: string;
  collection?: string;
  garmentType?: string;
  status?: ProductStatus;
};

export function bulkUpdateProducts(
  ids: string[],
  changes: BulkProductUpdate,
) {
  const selectedIds = new Set(ids);
  const now = new Date().toISOString();
  const products = getStoredProducts();

  const updatedProducts = products.map((product) => {
    if (!selectedIds.has(product.id)) {
      return product;
    }

    const updated: Product = {
      ...product,
      ...(changes.material !== undefined
        ? { material: changes.material }
        : {}),
      ...(changes.collection !== undefined
        ? { collection: changes.collection }
        : {}),
      ...(changes.garmentType !== undefined
        ? { garmentType: changes.garmentType }
        : {}),
      ...(changes.status !== undefined
        ? { status: changes.status }
        : {}),
      updatedAt: now,
    };

    if (changes.collection !== undefined) {
      updated.variants = updated.variants.map((variant) => ({
        ...variant,
        sku: generateSku(
          updated.collection,
          updated.code,
          variant.color,
          variant.size,
        ),
      }));
    }

    return updated;
  });

  saveProducts(updatedProducts);
  return updatedProducts.filter((product) =>
    selectedIds.has(product.id),
  );
}

export function setProductStatus(
  id: string,
  status: ProductStatus,
) {
  const products = getStoredProducts();
  const product = products.find(
    (item) => item.id === id,
  );

  if (!product) {
    throw new Error("Artikel niet gevonden.");
  }

  const updated: Product = {
    ...product,
    status,
    updatedAt: new Date().toISOString(),
  };

  saveProducts(
    products.map((item) =>
      item.id === id ? updated : item,
    ),
  );

  return updated;
}

export function deleteProduct(id: string) {
  const products = getStoredProducts();

  saveProducts(
    products.filter((product) => product.id !== id),
  );
}

export function duplicateProduct(id: string) {
  const source = getProductById(id);

  if (!source) {
    throw new Error("Artikel niet gevonden.");
  }

  const products = getStoredProducts();

  let newCode = `${source.code}-COPY`;
  let counter = 2;

  while (
    products.some(
      (product) =>
        product.code.toLowerCase() ===
        newCode.toLowerCase(),
    )
  ) {
    newCode = `${source.code}-COPY-${counter}`;
    counter += 1;
  }

  const now = new Date().toISOString();

  const duplicateInput: ProductInput = {
    code: newCode,
    name: `${source.name} kopie`,
    collection: source.collection,
    category: source.category,
    supplier: source.supplier,
    status: "Concept",
    vatCode: source.vatCode,
    brand: source.brand,
    garmentType: source.garmentType,
    fit: source.fit,
    colorFamily: source.colorFamily,
    seasonType: source.seasonType,
    material: source.material,
    countryOfOrigin: source.countryOfOrigin,
    description: source.description,
    purchasePrice: source.purchasePrice,
    wholesalePrice: source.wholesalePrice,
    shippingCosts: source.shippingCosts,
    otherCosts: source.otherCosts,
    totalCost: source.totalCost,
    brandMarkup: source.brandMarkup,
    recommendedRetailPrice: source.recommendedRetailPrice,
    retailerMarkup: source.retailerMarkup,
    colors: [...source.colors],
    sizes: [...source.sizes],
    stockByVariant: {},
  };

  const duplicate: Product = {
    id: createProductId(
      duplicateInput.name,
      duplicateInput.code,
    ),
    ...duplicateInput,
    variants: generateVariants(duplicateInput),
    createdAt: now,
    updatedAt: now,
  };

  saveProducts([...products, duplicate]);

  return duplicate;
}

export function getProductStock(product: Product) {
  return product.variants.reduce(
    (total, variant) =>
      total + variant.physicalStock,
    0,
  );
}

export function getReservedStock(product: Product) {
  return product.variants.reduce(
    (total, variant) =>
      total + variant.reservedStock,
    0,
  );
}
