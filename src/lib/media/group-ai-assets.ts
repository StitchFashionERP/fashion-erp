export type GroupableAiAsset = {
  id: string;
  assetId?: string | null;
  productId?: string | null;
  articleId?: string | null;
  articleCode: string;
  articleName: string;
  resultUrl?: string | null;
  isPrimary: boolean;
  versionNumber: number;
  assetStatus?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type AiArticleMediaGroup<
  TAsset extends GroupableAiAsset =
    GroupableAiAsset,
> = {
  key: string;
  productId: string;
  articleCode: string;
  articleName: string;
  primaryAsset: TAsset | null;
  galleryAssets: TAsset[];
  versionHistory: TAsset[];
  latestUpdatedAt: string;
  totalAssets: number;
};

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function getArticleGroupKey(
  asset: GroupableAiAsset,
) {
  const productId = asText(
    asset.productId ?? asset.articleId,
  );

  if (productId) {
    return `product:${productId}`;
  }

  const articleCode = asText(
    asset.articleCode,
  ).toLowerCase();

  if (articleCode) {
    return `article:${articleCode}`;
  }

  return `job:${asset.id}`;
}

function getAssetTimestamp(
  asset: GroupableAiAsset,
) {
  return (
    asText(asset.completedAt) ||
    asText(asset.updatedAt) ||
    asText(asset.createdAt)
  );
}

function sortNewestFirst<
  TAsset extends GroupableAiAsset,
>(
  first: TAsset,
  second: TAsset,
) {
  const dateComparison =
    getAssetTimestamp(second).localeCompare(
      getAssetTimestamp(first),
    );

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return (
    Number(second.versionNumber ?? 0) -
    Number(first.versionNumber ?? 0)
  );
}

export function groupAiAssetsByArticle<
  TAsset extends GroupableAiAsset,
>(
  assets: TAsset[],
): AiArticleMediaGroup<TAsset>[] {
  const groups = new Map<string, TAsset[]>();

  assets.forEach((asset) => {
    const key = getArticleGroupKey(asset);
    const current = groups.get(key) ?? [];

    current.push(asset);
    groups.set(key, current);
  });

  return Array.from(groups.entries())
    .map(([key, groupAssets]) => {
      const sorted = [...groupAssets].sort(
        sortNewestFirst,
      );

      const primaryAsset =
        sorted.find(
          (asset) =>
            asset.isPrimary &&
            Boolean(asset.resultUrl),
        ) ?? null;

      const galleryAssets = sorted.filter(
        (asset) =>
          Boolean(asset.resultUrl) &&
          asset.id !== primaryAsset?.id,
      );

      const referenceAsset =
        primaryAsset ?? sorted[0];

      return {
        key,
        productId: asText(
          referenceAsset?.productId ??
            referenceAsset?.articleId,
        ),
        articleCode:
          asText(
            referenceAsset?.articleCode,
          ) || "Zonder artikelnummer",
        articleName:
          asText(
            referenceAsset?.articleName,
          ) || "Onbekend artikel",
        primaryAsset,
        galleryAssets,
        versionHistory: sorted,
        latestUpdatedAt: getAssetTimestamp(
          sorted[0],
        ),
        totalAssets: sorted.length,
      };
    })
    .sort((first, second) =>
      second.articleCode.localeCompare(
        first.articleCode,
        "nl",
        {
          numeric: true,
          sensitivity: "base",
        },
      ),
    );
}
