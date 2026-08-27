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
  return value
    .trim()
    .toLowerCase();
}

function resolve(
  value: string,
  items: { name: string }[],
) {
  const normalized = normalize(value);

  return items.find(
    (item) =>
      normalize(item.name) === normalized,
  );
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
  const errors: string[] = [];

  if (
    input.brand &&
    !resolve(input.brand, getBrands())
  ) {
    errors.push(
      `Merk "${input.brand}" bestaat niet in Stamgegevens.`,
    );
  }

  if (
    input.color &&
    !resolve(input.color, getColors())
  ) {
    errors.push(
      `Kleur "${input.color}" bestaat niet in Stamgegevens.`,
    );
  }

  if (
    input.size &&
    !resolve(input.size, getSizes())
  ) {
    errors.push(
      `Maat "${input.size}" bestaat niet in Stamgegevens.`,
    );
  }

  if (
    input.category &&
    !resolve(input.category, getCategories())
  ) {
    errors.push(
      `Categorie "${input.category}" bestaat niet in Stamgegevens.`,
    );
  }

  if (
    input.productType &&
    !resolve(input.productType, getProductTypes())
  ) {
    errors.push(
      `Producttype "${input.productType}" bestaat niet in Stamgegevens.`,
    );
  }

  if (
    input.supplier &&
    !getSuppliers().some(
      (supplier) =>
        supplier.companyName
          .trim()
          .toLowerCase() ===
        input.supplier!.trim().toLowerCase(),
    )
  ) {
    errors.push(
      `Leverancier "${input.supplier}" bestaat niet in Stamgegevens.`,
    );
  }

  if (
    input.collection &&
    !resolve(input.collection, getCollections())
  ) {
    errors.push(
      `Collectie "${input.collection}" bestaat niet in Stamgegevens.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
