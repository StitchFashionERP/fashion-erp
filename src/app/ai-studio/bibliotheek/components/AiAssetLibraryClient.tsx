"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  groupAiAssetsByArticle,
} from "@/lib/media/group-ai-assets";
import { PackshotReview } from "./PackshotReview";
import styles from "./article-media-library.module.css";

type AiAssetJob = {
  id: string;
  assetId: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  type: string;
  status: string;
  presetName: string;
  sourceFileName: string;
  sourceUrl: string | null;
  resultUrl: string | null;
  resultPath: string;
  provider: string;
  model: string;
  errorMessage: string;
  completedAt: string;
  versionNumber: number;
  assetStatus: "CONCEPT" | "APPROVED";
  isPrimary: boolean;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
};

type ApprovalResponse = {
  id: string;
  articleId: string | null;
  articleCode: string | null;
  articleName: string | null;
  type: string;
  versionNumber: number;
  assetStatus: "CONCEPT" | "APPROVED";
  isPrimary: boolean;
  approvedAt: string | null;
};

type PendingActionType =
  | "approve"
  | "approve-primary"
  | "revoke";

type PendingAction = {
  jobId: string;
  action: PendingActionType;
} | null;

function readErrorMessage(
  body: unknown,
  fallback: string,
) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body
  ) {
    return String(
      (body as { error?: unknown }).error ??
        fallback,
    );
  }

  return fallback;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function formatDate(value: string) {
  if (!value) {
    return "Onbekende datum";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Onbekende datum";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function jobTypeLabel(type: string) {
  if (type === "PRODUCT_SHOT") {
    return "Packshot";
  }

  if (type === "MODEL_SHOT") {
    return "Modelfoto";
  }

  if (type === "SOURCE_ENHANCEMENT") {
    return "Verbeterde bronfoto";
  }

  return "AI-afbeelding";
}

function normalizeAsset(
  value: unknown,
): AiAssetJob | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  const id = text(row.id);
  const articleCode = text(row.articleCode);
  const articleName = text(row.articleName);

  if (!id || !articleCode || !articleName) {
    return null;
  }

  return {
    id,
    assetId: text(
      row.assetId ??
        row.mediaAssetId ??
        row.media_asset_id,
    ),
    articleId: text(
      row.articleId ?? row.productId,
    ),
    articleCode,
    articleName,
    type: text(row.type) || "PRODUCT_SHOT",
    status: text(row.status),
    presetName: text(row.presetName),
    sourceFileName: text(row.sourceFileName),
    sourceUrl:
      typeof row.sourceUrl === "string"
        ? row.sourceUrl
        : null,
    resultUrl:
      typeof row.resultUrl === "string"
        ? row.resultUrl
        : null,
    resultPath: text(row.resultPath),
    provider: text(row.provider),
    model: text(row.model),
    errorMessage: text(row.errorMessage),
    completedAt: text(row.completedAt),
    versionNumber: Math.max(
      1,
      Number(row.versionNumber ?? 1),
    ),
    assetStatus:
      row.assetStatus === "APPROVED"
        ? "APPROVED"
        : "CONCEPT",
    isPrimary: Boolean(row.isPrimary),
    approvedAt: text(row.approvedAt),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
  };
}

type AiAssetLibraryClientProps = {
  articleId?: string;
};

export function AiAssetLibraryClient({
  articleId,
}: AiAssetLibraryClientProps) {
  const [jobs, setJobs] = useState<AiAssetJob[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] =
    useState<PendingAction>(null);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<
    Set<string>
  >(new Set());

  const loadJobs = useCallback(async () => {
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
          readErrorMessage(
            body,
            "De AI-bibliotheek kon niet worden geladen.",
          ),
        );
      }

      if (!Array.isArray(body)) {
        throw new Error(
          "De AI-bibliotheek heeft een ongeldig formaat.",
        );
      }

      setJobs(
        body
          .map(normalizeAsset)
          .filter(
            (
              asset,
            ): asset is AiAssetJob =>
              asset !== null,
          ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De AI-bibliotheek kon niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const assets = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "COMPLETED" &&
          Boolean(job.resultUrl),
      ),
    [jobs],
  );

  const groups = useMemo(() => {
    const grouped =
      groupAiAssetsByArticle(assets);

    if (!articleId) {
      return grouped;
    }

    return grouped.filter(
      (group) =>
        group.productId === articleId,
    );
  }, [articleId, assets]);

  function isPending(
    jobId: string,
    action?: PendingActionType,
  ) {
    if (!pendingAction) {
      return false;
    }

    if (pendingAction.jobId !== jobId) {
      return false;
    }

    return action
      ? pendingAction.action === action
      : true;
  }

  function updateLocalAsset(
    response: ApprovalResponse,
  ) {
    setJobs((current) =>
      current.map((job) => {
        if (
          response.isPrimary &&
          job.articleId === response.articleId &&
          job.id !== response.id
        ) {
          return {
            ...job,
            isPrimary: false,
          };
        }

        if (job.id !== response.id) {
          return job;
        }

        return {
          ...job,
          versionNumber:
            response.versionNumber ??
            job.versionNumber,
          assetStatus:
            response.assetStatus ??
            job.assetStatus,
          isPrimary:
            response.isPrimary ?? false,
          approvedAt:
            response.approvedAt ?? "",
        };
      }),
    );
  }

  async function updateApproval(
    asset: AiAssetJob,
    approved: boolean,
    makePrimary: boolean,
  ) {
    const action: PendingActionType =
      approved && makePrimary
        ? "approve-primary"
        : approved
          ? "approve"
          : "revoke";

    setPendingAction({
      jobId: asset.id,
      action,
    });
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/ai-studio/jobs/${encodeURIComponent(
          asset.id,
        )}/approval`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved,
            makePrimary,
          }),
        },
      );

      const body = (await response
        .json()
        .catch(() => null)) as
        | ApprovalResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          readErrorMessage(
            body,
            "De afbeelding kon niet worden bijgewerkt.",
          ),
        );
      }

      if (
        !body ||
        typeof body !== "object" ||
        !("id" in body)
      ) {
        throw new Error(
          "De afbeelding kon niet worden bijgewerkt.",
        );
      }

      updateLocalAsset(
        body as ApprovalResponse,
      );

      if (makePrimary) {
        setMessage(
          `${asset.articleCode} v${asset.versionNumber} is ingesteld als hoofdafbeelding.`,
        );
      } else if (approved) {
        setMessage(
          `${asset.articleCode} v${asset.versionNumber} is toegevoegd aan de galerij.`,
        );
      } else {
        setMessage(
          `Goedkeuring van ${asset.articleCode} v${asset.versionNumber} is ingetrokken.`,
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De afbeelding kon niet worden bijgewerkt.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteAsset(
    asset: AiAssetJob,
  ) {
    const identifier =
      asset.assetId || asset.id;

    const confirmed = window.confirm(
      "Weet je zeker dat je deze afbeelding definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(identifier);
    setError("");
    setMessage("");

    try {
      const endpoint = asset.assetId
        ? `/api/media/assets/${encodeURIComponent(
            asset.assetId,
          )}?mode=delete`
        : `/api/ai-studio/jobs/${encodeURIComponent(
            asset.id,
          )}/delete`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const body = (await response
        .json()
        .catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          body?.error ||
            "De afbeelding kon niet worden verwijderd.",
        );
      }

      setJobs((current) =>
        current.filter(
          (job) => job.id !== asset.id,
        ),
      );

      setMessage("Afbeelding verwijderd.");

      await loadJobs();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De afbeelding kon niet worden verwijderd.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function toggleGroup(key: string) {
    setOpenGroups((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  if (loading) {
    return (
      <div className={styles.stateCard}>
        <div className={styles.spinner} />
        <strong>Bibliotheek laden</strong>
        <p>
          De afbeeldingen worden per artikel
          gegroepeerd.
        </p>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className={styles.stateCard}>
        <strong>
          Bibliotheek laden is mislukt
        </strong>
        <p>{error}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void loadJobs()}
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className={styles.stateCard}>
        <strong>
          Nog geen afbeeldingen
        </strong>
        <p>
          Maak eerst een packshot in de Workspace.
          Het artikel verschijnt daarna automatisch
          in deze bibliotheek.
        </p>
        <Link
          href="/ai-studio/workspace"
          className={styles.primaryButton}
        >
          Open Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.library}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <strong>
            {groups.length}{" "}
            {groups.length === 1
              ? "artikel"
              : "artikelen"}
          </strong>
          <span>
            Hoofdafbeeldingen, galerijbeelden en
            AI-versies zijn per artikel gebundeld.
          </span>
        </div>

        <div className={styles.toolbarActions}>
          <Link
            href="/ai-studio/workspace"
            className={styles.primaryButton}
          >
            Nieuwe generatie
          </Link>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void loadJobs()}
          >
            Vernieuwen
          </button>
        </div>
      </div>

      {message && (
        <div className={styles.message}>
          {message}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <section className={styles.articleList}>
        {groups.map((group) => {
          const primary =
            group.primaryAsset;
          const gallery =
            group.galleryAssets.filter(
              (asset) =>
                asset.assetStatus === "APPROVED",
            );
          const historyOpen =
            openGroups.has(group.key);

          return (
            <article
              key={group.key}
              className={styles.articleGroup}
            >
              <header
                className={styles.articleHeader}
              >
                <div
                  className={styles.articleIdentity}
                >
                  <strong>
                    {group.articleName}
                  </strong>
                  <span>
                    {group.articleCode}
                  </span>
                </div>

                <div
                  className={styles.articleStats}
                >
                  <span
                    className={styles.statBadge}
                  >
                    {gallery.length +
                      (primary ? 1 : 0)}{" "}
                    media
                  </span>
                  <span
                    className={styles.statBadge}
                  >
                    {group.versionHistory.length}{" "}
                    AI-versies
                  </span>
                  <span
                    className={styles.statBadge}
                  >
                    Laatst gewijzigd{" "}
                    {formatDate(
                      group.latestUpdatedAt,
                    )}
                  </span>
                </div>
              </header>

              <div className={styles.articleBody}>
                <section
                  className={styles.primaryColumn}
                >
                  <div
                    className={styles.sectionTitle}
                  >
                    <strong>
                      Hoofdafbeelding
                    </strong>
                  </div>

                  {primary &&
                  primary.resultUrl ? (
                    <div
                      className={styles.primaryCard}
                    >
                      <div
                        className={
                          styles.primaryImageFrame
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={primary.resultUrl}
                          alt={`Hoofdafbeelding van ${group.articleName}`}
                          className={
                            styles.primaryImage
                          }
                        />
                        <span
                          className={
                            styles.primaryBadge
                          }
                        >
                          Hoofdafbeelding
                        </span>
                        <span
                          className={
                            styles.versionBadge
                          }
                        >
                          v
                          {
                            primary.versionNumber
                          }
                        </span>
                      </div>

                      <div
                        className={
                          styles.primaryMeta
                        }
                      >
                        <div
                          className={
                            styles.primaryMetaText
                          }
                        >
                          <strong>
                            {jobTypeLabel(
                              primary.type,
                            )}
                          </strong>
                          <span>
                            {formatDate(
                              primary.completedAt ||
                                primary.updatedAt,
                            )}
                          </span>
                        </div>

                        <div
                          className={
                            styles.actions
                          }
                        >
                          {primary.resultUrl && (
                            <a
                              href={primary.resultUrl}
                              download
                              className={
                                styles.secondaryButton
                              }
                            >
                              Download PNG
                            </a>
                          )}

                          {primary.sourceUrl && (
                            <a
                              href={primary.sourceUrl}
                              download
                              className={
                                styles.secondaryButton
                              }
                            >
                              Download bronfoto
                            </a>
                          )}

                          <button
                            type="button"
                            className={
                              styles.dangerButton
                            }
                            onClick={() =>
                              void deleteAsset(
                                primary,
                              )
                            }
                            disabled={
                              deletingId ===
                              (primary.assetId ||
                                primary.id)
                            }
                          >
                            {deletingId ===
                            (primary.assetId ||
                              primary.id)
                              ? "Verwijderen..."
                              : "Verwijderen"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={
                        styles.emptyPrimary
                      }
                    >
                      Nog geen hoofdafbeelding
                      ingesteld.
                    </div>
                  )}
                </section>

                <section
                  className={styles.galleryColumn}
                >
                  <div
                    className={styles.sectionTitle}
                  >
                    <strong>
                      Overige afbeeldingen
                    </strong>
                    <span>
                      {gallery.length}
                    </span>
                  </div>

                  {gallery.length > 0 ? (
                    <div
                      className={
                        styles.galleryGrid
                      }
                    >
                      {gallery.map((asset) => (
                        <div
                          key={asset.id}
                          className={
                            styles.galleryCard
                          }
                        >
                          <div
                            className={
                              styles.galleryImageFrame
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                asset.resultUrl ??
                                ""
                              }
                              alt={`${jobTypeLabel(
                                asset.type,
                              )} van ${group.articleName}`}
                              className={
                                styles.galleryImage
                              }
                            />
                            <span
                              className={
                                styles.versionBadge
                              }
                            >
                              v
                              {
                                asset.versionNumber
                              }
                            </span>
                          </div>

                          <div
                            className={
                              styles.galleryMeta
                            }
                          >
                            <strong>
                              {jobTypeLabel(
                                asset.type,
                              )}
                            </strong>
                            <span>
                              {formatDate(
                                asset.completedAt ||
                                  asset.updatedAt,
                              )}
                            </span>

                            <div
                              className={
                                styles.actions
                              }
                            >
                              {asset.resultUrl && (
                                <a
                                  href={asset.resultUrl}
                                  download
                                  className={
                                    styles.secondaryButton
                                  }
                                >
                                  Download PNG
                                </a>
                              )}

                              {asset.sourceUrl && (
                                <a
                                  href={asset.sourceUrl}
                                  download
                                  className={
                                    styles.secondaryButton
                                  }
                                >
                                  Download bronfoto
                                </a>
                              )}

                              <button
                                type="button"
                                className={
                                  styles.secondaryButton
                                }
                                onClick={() =>
                                  void updateApproval(
                                    asset,
                                    true,
                                    true,
                                  )
                                }
                                disabled={isPending(
                                  asset.id,
                                )}
                              >
                                Maak hoofd
                              </button>

                              <button
                                type="button"
                                className={
                                  styles.iconButton
                                }
                                title="Afbeelding verwijderen"
                                aria-label="Afbeelding verwijderen"
                                onClick={() =>
                                  void deleteAsset(
                                    asset,
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  (asset.assetId ||
                                    asset.id)
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={
                        styles.emptyGallery
                      }
                    >
                      Er zijn nog geen
                      galerijafbeeldingen.
                    </div>
                  )}
                </section>
              </div>

              <section
                className={styles.versionSection}
              >
                <button
                  type="button"
                  className={styles.versionToggle}
                  onClick={() =>
                    toggleGroup(group.key)
                  }
                >
                  <span>
                    {historyOpen ? "▼" : "▶"}{" "}
                    AI-versiegeschiedenis
                  </span>
                  <span>
                    {
                      group.versionHistory
                        .length
                    }{" "}
                    versies
                  </span>
                </button>

                {historyOpen && (
                  <div
                    className={styles.versionList}
                  >
                    {group.versionHistory.map(
                      (asset) => {
                        const approved =
                          asset.assetStatus ===
                          "APPROVED";

                        return (
                          <div
                            key={asset.id}
                            className={
                              styles.versionItem
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                asset.resultUrl ??
                                ""
                              }
                              alt={`Versie ${asset.versionNumber}`}
                              className={
                                styles.versionThumb
                              }
                            />

                            <div
                              className={
                                styles.versionContent
                              }
                            >
                              <div
                                className={
                                  styles.versionHeading
                                }
                              >
                                <div>
                                  <strong>
                                    Versie{" "}
                                    {
                                      asset.versionNumber
                                    }
                                    {asset.isPrimary
                                      ? " · Hoofdafbeelding"
                                      : ""}
                                  </strong>
                                  <span>
                                    {jobTypeLabel(
                                      asset.type,
                                    )}
                                    {" · "}
                                    {approved
                                      ? "Goedgekeurd"
                                      : "Concept"}
                                    {" · "}
                                    {formatDate(
                                      asset.completedAt ||
                                        asset.updatedAt,
                                    )}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  className={
                                    styles.iconButton
                                  }
                                  title="Versie verwijderen"
                                  aria-label="Versie verwijderen"
                                  onClick={() =>
                                    void deleteAsset(
                                      asset,
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    (asset.assetId ||
                                      asset.id)
                                  }
                                >
                                  ×
                                </button>
                              </div>

                              <div
                                className={
                                  styles.actions
                                }
                              >
                                {asset.resultUrl && (
                                  <a
                                    href={asset.resultUrl}
                                    download
                                    className={
                                      styles.secondaryButton
                                    }
                                  >
                                    Download PNG
                                  </a>
                                )}

                                {asset.sourceUrl && (
                                  <a
                                    href={asset.sourceUrl}
                                    download
                                    className={
                                      styles.secondaryButton
                                    }
                                  >
                                    Download bronfoto
                                  </a>
                                )}

                                {!approved && (
                                  <button
                                    type="button"
                                    className={
                                      styles.secondaryButton
                                    }
                                    onClick={() =>
                                      void updateApproval(
                                        asset,
                                        true,
                                        false,
                                      )
                                    }
                                    disabled={isPending(
                                      asset.id,
                                    )}
                                  >
                                    Toevoegen aan
                                    galerij
                                  </button>
                                )}

                                {!asset.isPrimary && (
                                  <button
                                    type="button"
                                    className={
                                      styles.primaryButton
                                    }
                                    onClick={() =>
                                      void updateApproval(
                                        asset,
                                        true,
                                        true,
                                      )
                                    }
                                    disabled={isPending(
                                      asset.id,
                                    )}
                                  >
                                    Maak
                                    hoofdafbeelding
                                  </button>
                                )}

                                {approved && (
                                  <button
                                    type="button"
                                    className={
                                      styles.dangerButton
                                    }
                                    onClick={() =>
                                      void updateApproval(
                                        asset,
                                        false,
                                        false,
                                      )
                                    }
                                    disabled={isPending(
                                      asset.id,
                                    )}
                                  >
                                    Uit galerij halen
                                  </button>
                                )}
                              </div>

                              <div
                                className={
                                  styles.reviewWrap
                                }
                              >
                                <PackshotReview
                                  jobId={asset.id}
                                  versionNumber={
                                    asset.versionNumber
                                  }
                                  onCompleted={() =>
                                    void loadJobs()
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </section>
            </article>
          );
        })}
      </section>
    </div>
  );
}
