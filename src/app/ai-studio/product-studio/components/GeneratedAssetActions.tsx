"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "../../ai-studio.module.css";

type Props = {
  jobId: string;
  articleId: string;
  articleCode: string;
  sourceUrl: string | null;
  resultUrl: string | null;
};

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
      (body as { error?: unknown }).error ?? fallback,
    );
  }

  return fallback;
}

export function GeneratedAssetActions({
  jobId,
  articleId,
  articleCode,
  sourceUrl,
  resultUrl,
}: Props) {
  const [isApproving, setIsApproving] =
    useState(false);
  const [approved, setApproved] =
    useState(false);
  const [error, setError] = useState("");

  async function approveAsPrimary() {
    setIsApproving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/ai-studio/jobs/${encodeURIComponent(jobId)}/approval`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved: true,
            makePrimary: true,
          }),
        },
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(
            body,
            "Goedkeuren is mislukt.",
          ),
        );
      }

      setApproved(true);

      setTimeout(() => {
        window.location.href =
          `/artikelen/${articleId}`;
      }, 900);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Goedkeuren is mislukt.",
      );
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className={styles.workspaceResultActions}>
      <div>
        {resultUrl && (
          <a
            href={resultUrl}
            download
            className={styles.secondaryButton}
          >
            Download PNG
          </a>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            download
            className={styles.secondaryButton}
          >
            Download bronfoto
          </a>
        )}
      </div>

      {!approved ? (
        <button
          type="button"
          className={styles.primaryButton}
          onClick={approveAsPrimary}
          disabled={isApproving}
        >
          {isApproving
            ? "Goedkeuren..."
            : "Goedkeuren als hoofdafbeelding"}
        </button>
      ) : (
        <>
          <div className={styles.successNotice}>
            Packshot goedgekeurd en gekoppeld aan {articleCode}.
          </div>

          <Link
            href={`/artikelen/${articleId}`}
            className={styles.primaryButton}
          >
            Open artikel
          </Link>
        </>
      )}

      {error && (
        <div className={styles.errorNotice}>
          {error}
        </div>
      )}
    </div>
  );
}
