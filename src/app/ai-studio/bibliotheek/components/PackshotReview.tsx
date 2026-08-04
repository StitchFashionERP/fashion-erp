"use client";

import { useState } from "react";
import styles from "./packshot-review.module.css";

type Props = {
  jobId: string;
  versionNumber: number;
  onCompleted: () => void;
};

const improvementOptions = [
  "Exactere kleur",
  "Meer stofdetail",
  "Minder kreukels",
  "Halslijn corrigeren",
  "Mouwen corrigeren",
  "Zoom corrigeren",
  "Logo scherper",
  "Stiksels behouden",
  "Zachtere schaduw",
  "Meer witruimte",
];

const positiveOptions = [
  "Kleur behouden",
  "Belichting behouden",
  "Achtergrond behouden",
  "Compositie behouden",
  "Stofstructuur behouden",
];

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

export function PackshotReview({
  jobId,
  versionNumber,
  onCompleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [positivePoints, setPositivePoints] =
    useState<string[]>([]);
  const [improvementPoints, setImprovementPoints] =
    useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  function toggleValue(
    value: string,
    current: string[],
    setter: (values: string[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function createNextVersion() {
    setProcessing(true);
    setError("");

    try {
      const reviewResponse = await fetch(
        `/api/ai-studio/jobs/${encodeURIComponent(
          jobId,
        )}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            positivePoints,
            improvementPoints,
            comment,
          }),
        },
      );

      const reviewBody = (await reviewResponse
        .json()
        .catch(() => null)) as
        | {
            nextJobId?: string;
          }
        | { error?: string }
        | null;

      if (!reviewResponse.ok) {
        throw new Error(
          readErrorMessage(
            reviewBody,
            "De nieuwe versie kon niet worden voorbereid.",
          ),
        );
      }

      const nextJobId =
        reviewBody &&
        typeof reviewBody === "object" &&
        "nextJobId" in reviewBody
          ? String(reviewBody.nextJobId ?? "")
          : "";

      if (!nextJobId) {
        throw new Error(
          "De review heeft geen nieuwe AI-job aangemaakt.",
        );
      }

      const generationResponse = await fetch(
        `/api/ai-studio/jobs/${encodeURIComponent(
          nextJobId,
        )}/generate`,
        {
          method: "POST",
        },
      );

      const generationBody = await generationResponse
        .json()
        .catch(() => null);

      if (!generationResponse.ok) {
        throw new Error(
          readErrorMessage(
            generationBody,
            "De nieuwe packshot kon niet worden gegenereerd.",
          ),
        );
      }

      setOpen(false);
      setPositivePoints([]);
      setImprovementPoints([]);
      setComment("");
      onCompleted();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "De nieuwe versie kon niet worden gemaakt.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={styles.openButton}
        onClick={() => setOpen(true)}
      >
        Feedback geven en v{versionNumber + 1} maken
      </button>
    );
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <strong>Nieuwe versie op basis van feedback</strong>
          <span>
            Alleen de gekozen details worden aangepast.
          </span>
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setOpen(false)}
          disabled={processing}
        >
          Sluiten
        </button>
      </header>

      <div className={styles.group}>
        <strong>Dit moet hetzelfde blijven</strong>

        <div className={styles.chips}>
          {positiveOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={
                positivePoints.includes(option)
                  ? styles.chipSelected
                  : styles.chip
              }
              onClick={() =>
                toggleValue(
                  option,
                  positivePoints,
                  setPositivePoints,
                )
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <strong>Dit moet worden verbeterd</strong>

        <div className={styles.chips}>
          {improvementOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={
                improvementPoints.includes(option)
                  ? styles.chipSelected
                  : styles.chip
              }
              onClick={() =>
                toggleValue(
                  option,
                  improvementPoints,
                  setImprovementPoints,
                )
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.comment}>
        <span>Eigen detailopmerking</span>
        <textarea
          value={comment}
          onChange={(event) =>
            setComment(event.target.value)
          }
          placeholder="Bijvoorbeeld: behoud exact drie knopen en maak de linker manchet gelijk aan het origineel."
        />
      </label>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <button
        type="button"
        className={styles.generateButton}
        onClick={createNextVersion}
        disabled={
          processing ||
          (improvementPoints.length === 0 &&
            !comment.trim())
        }
      >
        {processing
          ? `Versie ${versionNumber + 1} wordt gemaakt...`
          : `Maak versie ${versionNumber + 1}`}
      </button>
    </section>
  );
}
