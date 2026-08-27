import {
  getBrands,
  getCategories,
  getColors,
  getProductTypes,
  getSizes,
  getSuppliers,
  getCollections,
} from "@/lib/master-data";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function exists(
  value: string | undefined,
  items: { name: string }[],
) {
  if (!value) return true;

  return items.some(
    (item) =>
      normalize(item.name) === normalize(value),
  );
}

function addMissing(
  target: string[],
  value: string | undefined,
  items: { name: string }[],
) {
  if (
    value &&
    !exists(value, items)
  ) {
    target.push(value);
  }
}

export function validateImportMasterData(input: {
  brand?: string;
  color?: string;
  size?: string;
  category?: string;
  productType?: string;
  supplier?: string;
  collection?: string;
}) {
  const missing = {
    brands: [] as string[],
    colors: [] as string[],
    sizes: [] as string[],
    categories: [] as string[],
    productTypes: [] as string[],
    suppliers: [] as string[],
    collections: [] as string[],
  };

  addMissing(
    missing.brands,
    input.brand,
    getBrands(),
  );

  addMissing(
    missing.colors,
    input.color,
    getColors(),
  );

  addMissing(
    missing.sizes,
    input.size,
    getSizes(),
  );

  addMissing(
    missing.categories,
    input.category,
    getCategories(),
  );

  addMissing(
    missing.productTypes,
    input.productType,
    getProductTypes(),
  );

  const suppliers = getSuppliers();

  if (
    input.supplier &&
    !suppliers.some(
      (supplier) =>
        normalize(supplier.companyName) ===
        normalize(input.supplier!),
    )
  ) {
    missing.suppliers.push(input.supplier);
  }

  addMissing(
    missing.collections,
    input.collection,
    getCollections(),
  );

  const hasErrors =
    Object.values(missing)
      .some(
        (items) => items.length > 0,
      );

  return {
    valid: !hasErrors,
    missing,
    errors: Object.entries(missing)
      .flatMap(
        ([type, items]) =>
          items.map(
            (item) =>
              `${type}: ${item}`,
          ),
      ),
  };
}
