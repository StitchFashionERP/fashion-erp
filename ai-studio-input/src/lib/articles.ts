import { getPricingDefaults } from "@/lib/company-settings";
import {
  calculatePricing,
  calculatePricingV2,
  defaultPricingLocks,
  type PricingLocks,
  type PricingStrategy,
} from "@/lib/pricing-engine";
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
  pricingStrategy: PricingStrategy;
  pricingLocks: PricingLocks;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  collection: string;
  category: string;
  supplier: string;
  supplierProductCode: string;
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
  pricingStrategy: PricingStrategy;
  pricingLocks: PricingLocks;

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
  supplierProductCode: string;
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
  pricingStrategy?: PricingStrategy;
  pricingLocks?: Partial<PricingLocks>;

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

let productCache: Product[] = [];
let pricingMigrationDone = false;

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
  collectionCode,
  productTypeCode,
  existingCodes = [],
}: {
  collectionCode?: string;
  productTypeCode?: string;
  existingCodes?: string[];
}) {
  const seasonPart = cleanCodePart(collectionCode ?? "", 4) || "XXXX";
  const typePart = cleanCodePart(productTypeCode ?? "", 2) || "XX";
  const prefix = `${seasonPart}${typePart}`;

  const usedCodes = [
    ...getStoredProducts().map((product) => product.code),
    ...existingCodes,
  ];

  const existingSequences = usedCodes
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.startsWith(prefix))
    .map((code) => code.slice(prefix.length))
    .filter((sequence) => /^\d+$/.test(sequence))
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);

  const next =
    (existingSequences.length ? Math.max(...existingSequences) : 0) + 1;

  return `${prefix}${String(next).padStart(2, "0")}`;
}

export function getColorArticleCode(productCode: string, colorCode: string) {
  return `${productCode}-${cleanCodePart(colorCode, 6)}`;
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

type NormalizedProductInput = Omit<
  ProductInput,
  "pricingStrategy" | "pricingLocks"
> & {
  pricingStrategy: PricingStrategy;
  pricingLocks: PricingLocks;
};

function normalizePricingInput(
  input: ProductInput,
): NormalizedProductInput {
  const defaults = getPricingDefaults();
  const pricing = calculatePricingV2(
    {
      supplierPurchasePrice: input.purchasePrice,
      shippingCosts: input.shippingCosts,
      otherCosts: input.otherCosts,
      brandMarkup: input.brandMarkup,
      salesPrice: input.wholesalePrice,
      retailerMarkup: input.retailerMarkup,
      recommendedRetailPrice: input.recommendedRetailPrice,
      strategy: input.pricingStrategy ?? "automatic",
      locks: input.pricingLocks ?? defaultPricingLocks,
      changedField: null,
    },
    defaults,
  );

  return {
    ...input,
    purchasePrice: pricing.supplierPurchasePrice,
    wholesalePrice: pricing.salesPrice,
    shippingCosts: pricing.shippingCosts,
    otherCosts: pricing.otherCosts,
    totalCost: pricing.totalCost,
    brandMarkup: pricing.brandMarkup,
    recommendedRetailPrice: pricing.recommendedRetailPrice,
    retailerMarkup: pricing.retailerMarkup,
    pricingStrategy: pricing.strategy,
    pricingLocks: pricing.locks,
  };
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
      pricingStrategy: input.pricingStrategy ?? "automatic",
      pricingLocks: {
        ...defaultPricingLocks,
        ...input.pricingLocks,
      },
    };
  });
}

function makeDefaultProduct(
  partial: Omit<ProductInput, "stockByVariant" | "supplierProductCode" | "shippingCosts" | "otherCosts" | "totalCost" | "brandMarkup" | "recommendedRetailPrice" | "retailerMarkup" | "pricingStrategy" | "pricingLocks" | "vatCode" | "garmentType" | "fit" | "colorFamily" | "seasonType"> & Partial<Pick<ProductInput, "supplierProductCode" | "shippingCosts" | "otherCosts" | "totalCost" | "brandMarkup" | "recommendedRetailPrice" | "retailerMarkup" | "pricingStrategy" | "pricingLocks" | "vatCode" | "garmentType" | "fit" | "colorFamily" | "seasonType">> & {
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
    supplierProductCode: partial.supplierProductCode ?? "",
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
    pricingStrategy: partial.pricingStrategy ?? "automatic",
    pricingLocks: {
      ...defaultPricingLocks,
      ...partial.pricingLocks,
    },
    colors: partial.colors,
    sizes: partial.sizes,
    stockByVariant: partial.stockByVariant,
  };

  const normalizedInput = normalizePricingInput(input);

  return {
    id: partial.id,
    ...normalizedInput,
    variants: generateVariants(normalizedInput),
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
    supplierProductCode: String(product.supplierProductCode ?? product.supplierArticleNumber ?? ""),
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
    pricingStrategy:
      (product.pricingStrategy as PricingStrategy | undefined) ??
      "automatic",
    pricingLocks: {
      ...defaultPricingLocks,
      ...(product.pricingLocks as Partial<PricingLocks> | undefined),
    },
    colors,
    sizes,
  };

  const normalizedInput = normalizePricingInput(input);

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
          purchasePrice: normalizedInput.purchasePrice,
          wholesalePrice: normalizedInput.wholesalePrice,
          shippingCosts: normalizedInput.shippingCosts,
          otherCosts: normalizedInput.otherCosts,
          totalCost: normalizedInput.totalCost,
          brandMarkup: normalizedInput.brandMarkup,
          recommendedRetailPrice:
            normalizedInput.recommendedRetailPrice,
          retailerMarkup: normalizedInput.retailerMarkup,
          pricingStrategy:
            normalizedInput.pricingStrategy ?? "automatic",
          pricingLocks: {
            ...defaultPricingLocks,
            ...normalizedInput.pricingLocks,
          },
        }),
      )
    : [];

  const generatedVariants = generateVariants(
    normalizedInput,
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
      product.id ??
        createProductId(normalizedInput.name, normalizedInput.code),
    ),
    ...normalizedInput,
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
  if (!force && pricingMigrationDone) {
    return {
      migratedProducts: 0,
      totalProducts: productCache.length,
    };
  }

  let migratedProducts = 0;
  const migrated = productCache.map((product) => {
    const normalized = normalizeLegacyProduct(
      product as unknown as Record<string, unknown>,
    );

    const changed =
      normalized.totalCost !== product.totalCost ||
      normalized.brandMarkup !== product.brandMarkup ||
      normalized.retailerMarkup !== product.retailerMarkup ||
      normalized.recommendedRetailPrice !== product.recommendedRetailPrice;

    if (changed) migratedProducts += 1;
    return normalized;
  });

  setProductCache(migrated);
  pricingMigrationDone = true;

  return { migratedProducts, totalProducts: migrated.length };
}

export function getStoredProducts(): Product[] {
  return productCache;
}

export function setProductCache(products: Product[]) {
  productCache = products.map((product) =>
    normalizeLegacyProduct(product as unknown as Record<string, unknown>),
  );
}

async function persistProductChanges(previous: Product[], next: Product[]) {
  const previousById = new Map(previous.map((product) => [product.id, product]));
  const nextIds = new Set(next.map((product) => product.id));

  for (const product of next) {
    const existing = previousById.get(product.id);
    const changed = !existing || JSON.stringify(existing) !== JSON.stringify(product);
    if (!changed) continue;

    const response = await fetch(
      existing ? `/api/articles/${encodeURIComponent(product.id)}` : "/api/articles",
      {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      },
    );
    const saved = await parseResponse<Product>(response);
    const current = productCache.filter((item) => item.id !== product.id);
    productCache = [...current, saved];
  }

  for (const product of previous) {
    if (nextIds.has(product.id)) continue;
    const response = await fetch(`/api/articles/${encodeURIComponent(product.id)}`, {
      method: "DELETE",
    });
    await parseResponse<{ ok: true }>(response);
  }
}

export function saveProducts(products: Product[]) {
  const previous = productCache;
  setProductCache(products);
  void persistProductChanges(previous, productCache).catch((error) => {
    console.error("Artikelen konden niet in Supabase worden opgeslagen.", error);
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String(body.error ?? "De artikelbewerking is mislukt.")
        : "De artikelbewerking is mislukt.";
    throw new Error(message);
  }

  return body as T;
}

function replaceCachedProduct(product: Product) {
  const products = getStoredProducts();
  const exists = products.some((item) => item.id === product.id);
  setProductCache(
    exists
      ? products.map((item) => (item.id === product.id ? product : item))
      : [...products, product],
  );
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/articles", {
    method: "GET",
    cache: "no-store",
  });
  const products = await parseResponse<Product[]>(response);
  setProductCache(products);
  return products;
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const response = await fetch(`/api/articles/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  const product = await parseResponse<Product>(response);
  replaceCachedProduct(product);
  return product;
}

export function getProductById(id: string) {
  return getStoredProducts().find((product) => product.id === id) ?? null;
}

export async function addProduct(input: ProductInput) {
  const now = new Date().toISOString();
  const normalizedInput = normalizePricingInput(input);
  const draft: Product = {
    id: createProductId(normalizedInput.name, normalizedInput.code),
    ...normalizedInput,
    variants: generateVariants(normalizedInput),
    createdAt: now,
    updatedAt: now,
  };

  const response = await fetch("/api/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const product = await parseResponse<Product>(response);
  replaceCachedProduct(product);

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

export async function updateProduct(id: string, input: ProductInput) {
  const current =
    getProductById(id) ?? (await fetchProductById(id));

  if (!current) {
    throw new Error("Artikel niet gevonden.");
  }

  const normalizedInput = normalizePricingInput(input);
  const updated: Product = {
    ...current,
    ...normalizedInput,
    variants: generateVariants(normalizedInput, current.variants),
    updatedAt: new Date().toISOString(),
  };

  const response = await fetch(`/api/articles/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  });
  const saved = await parseResponse<Product>(response);
  replaceCachedProduct(saved);

  recordPricingHistory({
    productId: saved.id,
    productCode: saved.code,
    productName: saved.name,
    action: "updated",
    before: getProductPricingSnapshot(current),
    after: getProductPricingSnapshot(saved),
  });

  return saved;
}

export type BulkProductUpdate = {
  material?: string;
  collection?: string;
  garmentType?: string;
  status?: ProductStatus;
};

export async function bulkUpdateProducts(
  ids: string[],
  changes: BulkProductUpdate,
) {
  const products = await fetchProducts();
  const selected = products.filter((product) => ids.includes(product.id));

  return Promise.all(
    selected.map((product) =>
      updateProduct(product.id, {
        ...product,
        ...changes,
        colors: [...product.colors],
        sizes: [...product.sizes],
      }),
    ),
  );
}

export async function setProductStatus(
  id: string,
  status: ProductStatus,
) {
  const product =
    getProductById(id) ?? (await fetchProductById(id));

  if (!product) {
    throw new Error("Artikel niet gevonden.");
  }

  return updateProduct(id, {
    ...product,
    status,
    colors: [...product.colors],
    sizes: [...product.sizes],
  });
}

export async function deleteProduct(id: string) {
  const response = await fetch(`/api/articles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await parseResponse<{ ok: true }>(response);
  setProductCache(getStoredProducts().filter((product) => product.id !== id));
}

export async function duplicateProduct(id: string) {
  const source =
    getProductById(id) ?? (await fetchProductById(id));

  if (!source) {
    throw new Error("Artikel niet gevonden.");
  }

  const products = getStoredProducts();
  let newCode = `${source.code}-COPY`;
  let counter = 2;

  while (
    products.some(
      (product) => product.code.toLowerCase() === newCode.toLowerCase(),
    )
  ) {
    newCode = `${source.code}-COPY-${counter}`;
    counter += 1;
  }

  return addProduct({
    code: newCode,
    name: `${source.name} kopie`,
    collection: source.collection,
    category: source.category,
    supplier: source.supplier,
    supplierProductCode: source.supplierProductCode,
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
    pricingStrategy: source.pricingStrategy,
    pricingLocks: { ...source.pricingLocks },
    colors: [...source.colors],
    sizes: [...source.sizes],
    stockByVariant: {},
  });
}

export function getProductStock(product: Product) {
  return product.variants.reduce(
    (total, variant) => total + variant.physicalStock,
    0,
  );
}

export function getReservedStock(product: Product) {
  return product.variants.reduce(
    (total, variant) => total + variant.reservedStock,
    0,
  );
}
