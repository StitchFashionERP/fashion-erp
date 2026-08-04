"use client";

import { useState } from "react";
import styles from "../../ai-studio.module.css";
import { GeneratedAssetActions } from "./GeneratedAssetActions";

type GeneratedPackshot = {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  type: string;
  status: string;
  presetName: string;
  provider: string;
  model: string;
  sourceUrl: string | null;
  resultUrl: string | null;
  resultPath: string;
  completedAt: string;
};

type PackshotGeneratorProps = {
  jobId: string;
  articleName: string;
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

export function PackshotGenerator({
  jobId,
  articleName,
}: PackshotGeneratorProps) {
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [result, setResult] =
    useState<GeneratedPackshot | null>(null);
  const [error, setError] = useState("");

  async function generatePackshot() {
    setIsGenerating(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `/api/ai-studio/jobs/${encodeURIComponent(
          jobId,
        )}/generate`,
        {
          method: "POST",
        },
      );

      const body = (await response
        .json()
        .catch(() => null)) as
        | GeneratedPackshot
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          readErrorMessage(
            body,
            "De packshot kon niet worden gegenereerd.",
          ),
        );
      }

      if (
        !body ||
        typeof body !== "object" ||
        !("resultUrl" in body)
      ) {
        throw new Error(
          "De AI heeft een ongeldig resultaat teruggestuurd.",
        );
      }

      const generated =
        body as GeneratedPackshot;

      if (!generated.resultUrl) {
        throw new Error(
          "Het resultaat is opgeslagen, maar kon niet worden weergegeven.",
        );
      }

      setResult(generated);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "De packshot kon niet worden gegenereerd.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className={styles.generationPanel}>
      <div className={styles.generationHeader}>
        <div>
          <h3 className={styles.generationTitle}>
            AI-packshot genereren
          </h3>
          <p className={styles.generationDescription}>
            De bronfoto is centraal opgeslagen. Start nu de
            eerste echte AI-bewerking voor {articleName}.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={generatePackshot}
          disabled={isGenerating}
        >
          {isGenerating
            ? "Packshot genereren..."
            : result
              ? "Opnieuw genereren"
              : "Maak AI-packshot"}
        </button>
      </div>

      {isGenerating && (
        <div className={styles.processingNotice}>
          <span className={styles.spinner} />
          <div>
            <strong>
              De packshot wordt gegenereerd
            </strong>
            <p>
              Dit kan één tot twee minuten duren. Sluit deze
              pagina niet tijdens de eerste test.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorNotice}>
          {error}
        </div>
      )}

      {result?.resultUrl && (
        <div className={styles.generatedResult}>
          <div className={styles.generatedImageFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.resultUrl}
              alt={`Gegenereerde packshot van ${articleName}`}
              className={styles.generatedImage}
            />
          </div>

          <div className={styles.generatedMetadata}>
            <div>
              <span>Status</span>
              <strong>Gereed</strong>
            </div>

            <div>
              <span>Provider</span>
              <strong>{result.provider}</strong>
            </div>

            <div>
              <span>Model</span>
              <strong>{result.model}</strong>
            </div>

            <div>
              <span>Preset</span>
              <strong>{result.presetName}</strong>
            </div>
          </div>

          <GeneratedAssetActions
            jobId={result.id}
            articleId={result.articleId}
            articleCode={result.articleCode}
          />
        </div>
      )}
    </section>
  );
}
