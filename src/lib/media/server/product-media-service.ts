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

  const result: PrimaryProductMediaMap = {};

  for (const rawLink of links ?? []) {
    const link = rawLink as unknown as DatabaseRow;
    const productId = asString(link.entity_id);

    if (!productId || result[productId]) {
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

    const { data: signed, error: signedUrlError } =
      await supabase.storage
        .from(storageBucket)
        .createSignedUrl(
          storagePath,
          signedUrlExpiresInSeconds,
        );

    if (
      signedUrlError ||
      !signed?.signedUrl
    ) {
      continue;
    }

    result[productId] = {
      assetId: asString(asset.id),
      imageUrl: signed.signedUrl,
      name: asString(asset.name),
      versionNumber: Number(
        asset.version_number ?? 1,
      ),
    };
  }

  return result;
}
