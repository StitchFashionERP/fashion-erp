"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  groupAiAssetsByArticle,
} from "@/lib/media/group-ai-assets";
import styles from "./library-overview.module.css";

const PAGE_SIZE = 25;

type OverviewAsset = {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  resultUrl: string | null;
  isPrimary: boolean;
  versionNumber: number;
  assetStatus: string;
  completedAt: string;
  updatedAt: string;
  createdAt: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeAsset(
  value: unknown,
): OverviewAsset | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  const id = text(row.id);
  const articleId = text(
    row.articleId ?? row.productId,
  );
  const articleCode = text(row.articleCode);
  const articleName = text(row.articleName);

  if (
    !id ||
    !articleId ||
    !articleCode ||
    !articleName
  ) {
    return null;
  }

  return {
    id,
    articleId,
    articleCode,
    articleName,
    resultUrl:
      typeof row.resultUrl === "string"
        ? row.resultUrl
        : null,
    isPrimary: Boolean(row.isPrimary),
    versionNumber: Math.max(
      1,
      Number(row.versionNumber ?? 1),
    ),
    assetStatus: text(row.assetStatus),
    completedAt: text(row.completedAt),
    updatedAt: text(row.updatedAt),
    createdAt: text(row.createdAt),
  };
}

function readError(
  body: unknown,
  fallback: string,
) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body
  ) {
    return text(
      (body as { error?: unknown }).error,
    ) || fallback;
  }

  return fallback;
}

export function AiAssetLibraryOverviewClient() {
  const [assets, setAssets] = useState<
    OverviewAsset[]
  >([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/ai-studio/jobs",
          {
            cache: "no-store",
          },
        );

        const body = (await response
          .json()
          .catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(
            readError(
              body,
              "De beeldbank kon niet worden geladen.",
            ),
          );
        }

        if (!Array.isArray(body)) {
          throw new Error(
            "De beeldbank heeft een ongeldig formaat.",
          );
        }

        const normalized = body
          .map(normalizeAsset)
          .filter(
            (
              asset,
            ): asset is OverviewAsset =>
              asset !== null &&
              Boolean(asset.resultUrl),
          );

        if (!cancelled) {
          setAssets(normalized);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "De beeldbank kon niet worden geladen.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(
    () => groupAiAssetsByArticle(assets),
    [assets],
  );

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLocaleLowerCase("nl-NL");

    if (!normalizedQuery) {
      return groups;
    }

    return groups.filter((group) =>
      [
        group.articleCode,
        group.articleName,
      ].some((value) =>
        value
          .toLocaleLowerCase("nl-NL")
          .includes(normalizedQuery),
      ),
    );
  }, [groups, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredGroups.length / PAGE_SIZE,
    ),
  );

  const safePage = Math.min(page, totalPages);

  const visibleGroups = filteredGroups.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query]);

  if (loading) {
    return (
      <div className={styles.state}>
        <div>
          <strong>Beeldbank laden</strong>
          <p>
            De artikelen en hoofdafbeeldingen
            worden verzameld.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${styles.state} ${styles.error}`}
      >
        <div>
          <strong>
            Beeldbank laden is mislukt
          </strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.overview}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <strong>
            {filteredGroups.length}{" "}
            {filteredGroups.length === 1
              ? "artikel"
              : "artikelen"}
          </strong>
          <span>
            Maximaal 25 artikelen per pagina,
            nieuwste artikelnummers eerst.
          </span>
        </div>

        <label className={styles.searchField}>
          <span>Zoeken</span>
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            placeholder="Artikelnummer of productnaam"
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        </label>
      </div>

      {visibleGroups.length === 0 ? (
        <div className={styles.state}>
          <div>
            <strong>
              Geen artikelen gevonden
            </strong>
            <p>
              Pas de zoekopdracht aan of maak
              eerst een AI-packshot.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleGroups.map((group) => {
            const cover =
              group.primaryAsset ??
              group.galleryAssets[0] ??
              group.versionHistory[0];

            return (
              <Link
                key={group.key}
                href={`/ai-studio/bibliotheek/${encodeURIComponent(
                  group.productId,
                )}`}
                className={styles.card}
              >
                <div
                  className={styles.imageFrame}
                >
                  {cover?.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.resultUrl}
                      alt={`${group.articleCode} · ${group.articleName}`}
                      className={styles.image}
                    />
                  ) : (
                    <div
                      className={
                        styles.placeholder
                      }
                    >
                      Nog geen afbeelding
                    </div>
                  )}

                  {group.primaryAsset && (
                    <span
                      className={
                        styles.primaryBadge
                      }
                    >
                      Hoofdafbeelding
                    </span>
                  )}
                </div>

                <div className={styles.content}>
                  <div
                    className={styles.identity}
                  >
                    <strong>
                      {group.articleName}
                    </strong>
                    <span>
                      {group.articleCode}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    <span>
                      {group.totalAssets}{" "}
                      {group.totalAssets === 1
                        ? "afbeelding"
                        : "afbeeldingen"}
                    </span>

                    <span
                      className={
                        styles.openLabel
                      }
                    >
                      Openen →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className={styles.pagination}
          aria-label="Paginering beeldbank"
        >
          <button
            type="button"
            className={styles.pageButton}
            disabled={safePage <= 1}
            onClick={() =>
              setPage((current) =>
                Math.max(1, current - 1),
              )
            }
          >
            Vorige
          </button>

          {Array.from(
            { length: totalPages },
            (_, index) => index + 1,
          ).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`${styles.pageNumber} ${
                pageNumber === safePage
                  ? styles.pageNumberActive
                  : ""
              }`}
              onClick={() =>
                setPage(pageNumber)
              }
              aria-current={
                pageNumber === safePage
                  ? "page"
                  : undefined
              }
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            className={styles.pageButton}
            disabled={safePage >= totalPages}
            onClick={() =>
              setPage((current) =>
                Math.min(
                  totalPages,
                  current + 1,
                ),
              )
            }
          >
            Volgende
          </button>
        </nav>
      )}
    </section>
  );
}
