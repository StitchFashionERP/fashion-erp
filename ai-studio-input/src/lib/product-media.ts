import { getSharedStateValue, setSharedStateValue } from "@/lib/shared-state-client";

export type ProductMediaType =
  | "packshot"
  | "detail"
  | "lifestyle"
  | "campaign";

export type ProductMedia = {
  id: string;
  productId: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  type: ProductMediaType;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

const storageKey = "fashion-erp-product-media-v1";

export const productMediaSharedStateKeys = [storageKey] as const;

function readAll(): ProductMedia[] {
  const items = getSharedStateValue<ProductMedia[]>(storageKey, []);
  return Array.isArray(items) ? items : [];
}

function writeAll(items: ProductMedia[]) {
  setSharedStateValue(storageKey, items);
}

export function getProductMedia(productId: string) {
  return readAll()
    .filter((item) => item.productId === productId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function addProductMedia(
  productId: string,
  files: Array<{
    name: string;
    dataUrl: string;
    mimeType: string;
  }>,
) {
  const current = readAll();
  const existing = current.filter((item) => item.productId === productId);
  const hasPrimary = existing.some((item) => item.isPrimary);
  const now = new Date().toISOString();

  const created = files.map((file, index): ProductMedia => ({
    id: `${productId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    name: file.name,
    dataUrl: file.dataUrl,
    mimeType: file.mimeType,
    type: "packshot",
    isPrimary: !hasPrimary && index === 0,
    sortOrder: existing.length + index,
    createdAt: now,
  }));

  writeAll([...current, ...created]);
  return getProductMedia(productId);
}

export function setPrimaryProductMedia(productId: string, mediaId: string) {
  const updated = readAll().map((item) =>
    item.productId === productId
      ? { ...item, isPrimary: item.id === mediaId }
      : item,
  );

  writeAll(updated);
  return getProductMedia(productId);
}

export function updateProductMediaType(
  productId: string,
  mediaId: string,
  type: ProductMediaType,
) {
  const updated = readAll().map((item) =>
    item.productId === productId && item.id === mediaId
      ? { ...item, type }
      : item,
  );

  writeAll(updated);
  return getProductMedia(productId);
}

export function deleteProductMedia(productId: string, mediaId: string) {
  const current = readAll();
  const removed = current.find((item) => item.id === mediaId);
  let updated = current.filter((item) => item.id !== mediaId);

  if (removed?.isPrimary) {
    const replacement = updated
      .filter((item) => item.productId === productId)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];

    if (replacement) {
      updated = updated.map((item) =>
        item.id === replacement.id ? { ...item, isPrimary: true } : item,
      );
    }
  }

  writeAll(updated);
  return getProductMedia(productId);
}
