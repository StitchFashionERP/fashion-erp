import type { SupabaseClient } from "@supabase/supabase-js";

type DatabaseRow = Record<string, unknown>;

export type PrimaryProductMedia = {
  assetId: string;
  imageUrl: string;
  name: string;
  versionNumber: number;
};

export type PrimaryProductMediaMap = Record<
  string,
  PrimaryProductMedia
>;

type GetPrimaryProductImagesOptions = {
  supabase: SupabaseClient;
  organizationId: string;
  productIds: string[];
  signedUrlExpiresInSeconds?: number;
};

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeProductIds(productIds: string[]) {
  return [
    ...new Set(
      productIds
        .map((productId) => asString(productId))
        .filter(Boolean),
    ),
  ];
}

export async function getPrimaryProductImages({
  supabase,
  organizationId,
  productIds,
  signedUrlExpiresInSeconds = 60 * 60,
}: GetPrimaryProductImagesOptions): Promise<PrimaryProductMediaMap> {
  const normalizedOrganizationId =
    asString(organizationId);
  const normalizedProductIds =
    normalizeProductIds(productIds);

  if (
    !normalizedOrganizationId ||
    normalizedProductIds.length === 0
  ) {
    return {};
  }

  const { data: links, error } = await supabase
    .from("media_asset_links")
    .select(
      `
      entity_id,
      is_primary,
      sort_order,
      media_assets (
        id,
        storage_bucket,
        storage_path,
        name,
        version_number
      )
    `,
    )
    .eq(
      "organization_id",
      normalizedOrganizationId,
    )
    .eq("entity_type", "PRODUCT")
    .in("entity_id", normalizedProductIds)
    .order("is_primary", {
      ascending: false,
    })
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  // First pass: pick the primary asset per product (no network calls yet),
  // grouped by storage bucket so the signed URLs for an entire catalog can
  // be requested in one call per bucket instead of one call per product.
  type PendingAsset = {
    productId: string;
    storagePath: string;
    assetId: string;
    name: string;
    versionNumber: number;
  };

  const pendingByBucket = new Map<string, PendingAsset[]>();
  const seenProductIds = new Set<string>();

  for (const rawLink of links ?? []) {
    const link = rawLink as unknown as DatabaseRow;
    const productId = asString(link.entity_id);

    if (!productId || seenProductIds.has(productId)) {
      continue;
    }

    const relatedAssets = link.media_assets;
    const rawAsset = Array.isArray(relatedAssets)
      ? relatedAssets[0]
      : relatedAssets;

    if (
      !rawAsset ||
      typeof rawAsset !== "object"
    ) {
      continue;
    }

    const asset =
      rawAsset as unknown as DatabaseRow;

    const storageBucket = asString(
      asset.storage_bucket,
    );
    const storagePath = asString(
      asset.storage_path,
    );

    if (!storageBucket || !storagePath) {
      continue;
    }

    seenProductIds.add(productId);

    const bucketList = pendingByBucket.get(storageBucket) ?? [];
    bucketList.push({
      productId,
      storagePath,
      assetId: asString(asset.id),
      name: asString(asset.name),
      versionNumber: Number(asset.version_number ?? 1),
    });
    pendingByBucket.set(storageBucket, bucketList);
  }

  const result: PrimaryProductMediaMap = {};

  for (const [storageBucket, pending] of pendingByBucket) {
    const { data: signedUrls, error: signedUrlError } =
      await supabase.storage
        .from(storageBucket)
        .createSignedUrls(
          pending.map((item) => item.storagePath),
          signedUrlExpiresInSeconds,
        );

    if (signedUrlError || !signedUrls) {
      continue;
    }

    pending.forEach((item, index) => {
      const signed = signedUrls[index];

      if (!signed || signed.error || !signed.signedUrl) {
        return;
      }

      result[item.productId] = {
        assetId: item.assetId,
        imageUrl: signed.signedUrl,
        name: item.name,
        versionNumber: item.versionNumber,
      };
    });
  }

  return result;
}
