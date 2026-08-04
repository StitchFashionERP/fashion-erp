"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "../library.module.css";
import { PackshotReview } from "./PackshotReview";

type AiAssetJob = {
  id: string;
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

function getAssetStatusLabel(
  assetStatus: string,
) {
  return assetStatus === "APPROVED"
    ? "Goedgekeurd"
    : "Concept";
}

function normalizeAsset(
  value: unknown,
): AiAssetJob | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  const id = String(row.id ?? "");
  const articleCode = String(
    row.articleCode ?? "",
  );
  const articleName = String(
    row.articleName ?? "",
  );

  if (!id || !articleCode || !articleName) {
    return null;
  }

  return {
    id,
    articleId: String(row.articleId ?? ""),
    articleCode,
    articleName,
    type: String(row.type ?? "PRODUCT_SHOT"),
    status: String(row.status ?? ""),
    presetName: String(row.presetName ?? ""),
    sourceFileName: String(
      row.sourceFileName ?? "",
    ),
    sourceUrl:
      typeof row.sourceUrl === "string"
        ? row.sourceUrl
        : null,
    resultUrl:
      typeof row.resultUrl === "string"
        ? row.resultUrl
        : null,
    resultPath: String(row.resultPath ?? ""),
    provider: String(row.provider ?? ""),
    model: String(row.model ?? ""),
    errorMessage: String(
      row.errorMessage ?? "",
    ),
    completedAt: String(
      row.completedAt ?? "",
    ),
    versionNumber: Math.max(
      1,
      Number(row.versionNumber ?? 1),
    ),
    assetStatus:
      row.assetStatus === "APPROVED"
        ? "APPROVED"
        : "CONCEPT",
    isPrimary: Boolean(row.isPrimary),
    approvedAt: String(
      row.approvedAt ?? "",
    ),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

export function AiAssetLibraryClient() {
  const [jobs, setJobs] = useState<AiAssetJob[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] =
    useState<PendingAction>(null);

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

      const normalized = body
        .map(normalizeAsset)
        .filter(
          (
            asset,
          ): asset is AiAssetJob =>
            asset !== null,
        );

      setJobs(normalized);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
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
      jobs
        .filter(
          (job) =>
            job.status === "COMPLETED" &&
            Boolean(job.resultUrl),
        )
        .sort((left, right) => {
          if (left.isPrimary !== right.isPrimary) {
            return left.isPrimary ? -1 : 1;
          }

          if (
            left.assetStatus !==
            right.assetStatus
          ) {
            return left.assetStatus === "APPROVED"
              ? -1
              : 1;
          }

          return (
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
          );
        }),
    [jobs],
  );

  function updateLocalAsset(
    response: ApprovalResponse,
  ) {
    setJobs((currentJobs) =>
      currentJobs.map((job) => {
        if (
          response.isPrimary &&
          job.articleId === response.articleId &&
          job.type === response.type &&
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
            "De goedkeuringsstatus kon niet worden aangepast.",
          ),
        );
      }

      if (
        !body ||
        typeof body !== "object" ||
        !("id" in body)
      ) {
        throw new Error(
          "De goedkeurings-API heeft een ongeldig resultaat teruggestuurd.",
        );
      }

      const approval =
        body as ApprovalResponse;

      updateLocalAsset(approval);

      if (!approved) {
        setMessage(
          `Goedkeuring van ${asset.articleCode} v${asset.versionNumber} is ingetrokken.`,
        );
      } else if (makePrimary) {
        setMessage(
          `${asset.articleCode} v${asset.versionNumber} is goedgekeurd en ingesteld als hoofdafbeelding.`,
        );
      } else {
        setMessage(
          `${asset.articleCode} v${asset.versionNumber} is goedgekeurd.`,
        );
      }
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "De goedkeuringsstatus kon niet worden aangepast.",
      );
    } finally {
      setPendingAction(null);
    }
  }

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

  if (loading) {
    return (
      <div className={styles.stateCard}>
        <div className={styles.spinner} />
        <strong>AI-afbeeldingen laden</strong>
        <p>
          De gegenereerde resultaten worden uit
          Supabase opgehaald.
        </p>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className={styles.errorCard}>
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
      <div className={styles.emptyState}>
        <strong>
          Nog geen gegenereerde afbeeldingen
        </strong>

        <p>
          Maak eerst een packshot in de Workspace.
          Zodra de generatie is voltooid, verschijnt
          het resultaat hier automatisch.
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
      <div className={styles.libraryToolbar}>
        <div>
          <strong>
            {assets.length}{" "}
            {assets.length === 1
              ? "AI-afbeelding"
              : "AI-afbeeldingen"}
          </strong>

          <span>
            Beheer concepten, goedgekeurde versies
            en hoofdafbeeldingen.
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
            disabled={loading}
          >
            Vernieuwen
          </button>
        </div>
      </div>

      {message && (
        <div className={styles.successMessage}>
          {message}
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <section className={styles.assetGrid}>
        {assets.map((asset) => {
          const approved =
            asset.assetStatus === "APPROVED";

          return (
            <article
              key={asset.id}
              className={`${styles.assetCard} ${
                asset.isPrimary
                  ? styles.assetCardPrimary
                  : approved
                    ? styles.assetCardApproved
                    : ""
              }`}
            >
              <div
                className={styles.assetImageFrame}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.resultUrl ?? ""}
                  alt={`${jobTypeLabel(
                    asset.type,
                  )} van ${asset.articleName}`}
                  className={styles.assetImage}
                />

                <div
                  className={styles.imageBadges}
                >
                  <span
                    className={
                      approved
                        ? styles.approvedBadge
                        : styles.conceptBadge
                    }
                  >
                    {getAssetStatusLabel(
                      asset.assetStatus,
                    )}
                  </span>

                  {asset.isPrimary && (
                    <span
                      className={styles.primaryBadge}
                    >
                      Hoofdafbeelding
                    </span>
                  )}

                  <span
                    className={styles.versionBadge}
                  >
                    v{asset.versionNumber}
                  </span>
                </div>
              </div>

              <div className={styles.assetContent}>
                <div
                  className={styles.assetTitleRow}
                >
                  <div>
                    <strong>
                      {asset.articleName}
                    </strong>
                    <span>
                      {asset.articleCode}
                    </span>
                  </div>

                  <span
                    className={styles.typeBadge}
                  >
                    {jobTypeLabel(asset.type)}
                  </span>
                </div>

                <dl
                  className={styles.assetDetails}
                >
                  <div>
                    <dt>Versie</dt>
                    <dd>
                      v{asset.versionNumber}
                    </dd>
                  </div>

                  <div>
                    <dt>Status</dt>
                    <dd>
                      {getAssetStatusLabel(
                        asset.assetStatus,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Preset</dt>
                    <dd>
                      {asset.presetName ||
                        "Standaard"}
                    </dd>
                  </div>

                  <div>
                    <dt>AI-model</dt>
                    <dd>
                      {asset.provider ||
                        "Onbekend"}
                      {" · "}
                      {asset.model ||
                        "Onbekend"}
                    </dd>
                  </div>

                  <div>
                    <dt>Gegenereerd</dt>
                    <dd>
                      {formatDate(
                        asset.completedAt ||
                          asset.updatedAt ||
                          asset.createdAt,
                      )}
                    </dd>
                  </div>

                  {approved && (
                    <div>
                      <dt>Goedgekeurd</dt>
                      <dd>
                        {formatDate(
                          asset.approvedAt,
                        )}
                      </dd>
                    </div>
                  )}
                </dl>

                <PackshotReview
                  jobId={asset.id}
                  versionNumber={asset.versionNumber}
                  onCompleted={() => void loadJobs()}
                />

                <div
                  className={styles.assetActions}
                >
                  {!approved ? (
                    <>
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
                        {isPending(
                          asset.id,
                          "approve",
                        )
                          ? "Goedkeuren..."
                          : "Goedkeuren"}
                      </button>

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
                        {isPending(
                          asset.id,
                          "approve-primary",
                        )
                          ? "Instellen..."
                          : "Goedkeuren als hoofdafbeelding"}
                      </button>
                    </>
                  ) : (
                    <>
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
                          {isPending(
                            asset.id,
                            "approve-primary",
                          )
                            ? "Instellen..."
                            : "Maak hoofdafbeelding"}
                        </button>
                      )}

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
                        {isPending(
                          asset.id,
                          "revoke",
                        )
                          ? "Intrekken..."
                          : "Goedkeuring intrekken"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
