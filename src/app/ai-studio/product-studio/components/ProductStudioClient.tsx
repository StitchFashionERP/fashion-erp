"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "../../ai-studio.module.css";
import { PhotoEditor } from "../../workspace/components/PhotoEditor";
import type { PhotoEditorTransform } from "@/lib/media/photo-editor";
import { PackshotGenerator } from "./PackshotGenerator";

type ArticleOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type SavedAiJob = {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  type: string;
  status: string;
  presetName: string;
  instructions: string;
  sourceFileName: string;
  sourceMimeType: string;
  sourceFileSize: number;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const acceptedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeArticle(
  value: unknown,
): ArticleOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  const id = String(row.id ?? "");
  const code = String(row.code ?? "");
  const name = String(row.name ?? "");

  if (!id || !code || !name) {
    return null;
  }

  return {
    id,
    code,
    name,
    status: String(row.status ?? ""),
  };
}

export function ProductStudioClient() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [articles, setArticles] = useState<
    ArticleOption[]
  >([]);
  const [articlesLoading, setArticlesLoading] =
    useState(true);
  const [articlesError, setArticlesError] =
    useState("");

  const [articleId, setArticleId] = useState("");
  const [presetName, setPresetName] = useState(
    "Transparante achtergrond",
  );
  const [instructions, setInstructions] =
    useState("");

  const [sourceFile, setSourceFile] =
    useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] =
    useState(false);
  const [editVersion, setEditVersion] =
    useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedJob, setSavedJob] =
    useState<SavedAiJob | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      setArticlesLoading(true);
      setArticlesError("");

      try {
        const response = await fetch(
          "/api/articles",
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
              "Artikelen ophalen is mislukt.",
            ),
          );
        }

        if (!Array.isArray(body)) {
          throw new Error(
            "De artikelenrespons heeft een ongeldig formaat.",
          );
        }

        const normalized = body
          .map(normalizeArticle)
          .filter(
            (
              article,
            ): article is ArticleOption =>
              article !== null,
          )
          .sort((left, right) =>
            left.code.localeCompare(
              right.code,
              "nl-NL",
              {
                numeric: true,
              },
            ),
          );

        if (!cancelled) {
          setArticles(normalized);
        }
      } catch (loadError) {
        if (!cancelled) {
          setArticlesError(
            loadError instanceof Error
              ? loadError.message
              : "Artikelen ophalen is mislukt.",
          );
        }
      } finally {
        if (!cancelled) {
          setArticlesLoading(false);
        }
      }
    }

    void loadArticles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sourceFile) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl =
      URL.createObjectURL(sourceFile);

    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [sourceFile, editVersion]);

  function resetJobState() {
    setSavedJob(null);
    setError("");
    setMessage("");
  }

  function validateAndSetFile(file: File) {
    resetJobState();

    if (!acceptedMimeTypes.has(file.type)) {
      setSourceFile(null);
      setError(
        "Gebruik een JPG-, PNG-, WebP-, HEIC- of HEIF-afbeelding.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSourceFile(null);
      setError(
        "De bronfoto mag maximaal 15 MB groot zijn.",
      );
      return;
    }

    if (file.size === 0) {
      setSourceFile(null);
      setError("Het gekozen bestand is leeg.");
      return;
    }

    setSourceFile(file);
    setEditVersion((current) => current + 1);
  }

  function handleFileInput(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      validateAndSetFile(file);
    }

    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      validateAndSetFile(file);
    }
  }

  function clearFile() {
    setSourceFile(null);
    setSavedJob(null);
    setError("");
    setMessage("");
  }

  async function handleEditedFile(
    file: File,
    _transform: PhotoEditorTransform,
  ) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "De bewerkte afbeelding is groter dan 15 MB.",
      );
    }

    setSourceFile(file);
    setSavedJob(null);
    setError("");
    setMessage(
      "Bewerking opgeslagen. Deze uitsnede wordt gebruikt voor de AI-packshot.",
    );
    setEditVersion((current) => current + 1);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSavedJob(null);

    if (!articleId) {
      setError("Selecteer eerst een artikel.");
      return;
    }

    if (!sourceFile) {
      setError("Selecteer eerst een bronfoto.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set("articleId", articleId);
      formData.set("presetName", presetName);
      formData.set(
        "instructions",
        instructions,
      );
      formData.set("sourceImage", sourceFile);

      const response = await fetch(
        "/api/ai-studio/jobs",
        {
          method: "POST",
          body: formData,
        },
      );

      const body = (await response
        .json()
        .catch(() => null)) as
        | SavedAiJob
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          readErrorMessage(
            body,
            "De bronfoto kon niet worden opgeslagen.",
          ),
        );
      }

      if (
        !body ||
        typeof body !== "object" ||
        !("id" in body)
      ) {
        throw new Error(
          "De opgeslagen AI Studio-opdracht heeft een ongeldig formaat.",
        );
      }

      const job = body as SavedAiJob;

      setSavedJob(job);
      setMessage(
        `Bronfoto opgeslagen bij ${job.articleCode} · ${job.articleName}.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "De bronfoto kon niet worden opgeslagen.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const selectedArticle =
    articles.find(
      (article) => article.id === articleId,
    ) ?? null;

  return (
    <form
      className={styles.workspace}
      onSubmit={handleSubmit}
    >
      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              Nieuwe productshot
            </h2>
            <p
              className={
                styles.cardDescription
              }
            >
              Selecteer een artikel, kies een
              bronfoto en positioneer het product
              voordat je de AI-packshot maakt.
            </p>
          </div>

          {savedJob && (
            <span
              className={
                styles.statusCompleted
              }
            >
              Concept opgeslagen
            </span>
          )}
        </div>

        <div className={styles.cardBody}>
          <div className={styles.formSection}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span
                  className={styles.fieldLabel}
                >
                  Artikel
                </span>

                <select
                  className={styles.select}
                  value={articleId}
                  onChange={(event) => {
                    setArticleId(
                      event.target.value,
                    );
                    resetJobState();
                  }}
                  disabled={
                    articlesLoading || isSaving
                  }
                >
                  <option value="">
                    {articlesLoading
                      ? "Artikelen laden..."
                      : "Selecteer een artikel"}
                  </option>

                  {articles.map((article) => (
                    <option
                      key={article.id}
                      value={article.id}
                    >
                      {article.code} ·{" "}
                      {article.name}
                      {article.status
                        ? ` · ${article.status}`
                        : ""}
                    </option>
                  ))}
                </select>

                {articlesError ? (
                  <span
                    className={
                      styles.fieldError
                    }
                  >
                    {articlesError}
                  </span>
                ) : (
                  <span
                    className={
                      styles.fieldHint
                    }
                  >
                    De artikelen worden rechtstreeks
                    uit STiTch geladen.
                  </span>
                )}
              </label>

              <label className={styles.field}>
                <span
                  className={styles.fieldLabel}
                >
                  Packshotstijl
                </span>

                <select
                  className={styles.select}
                  value={presetName}
                  onChange={(event) => {
                    setPresetName(
                      event.target.value,
                    );
                    setSavedJob(null);
                  }}
                  disabled={isSaving}
                >
                  <option value="Transparante achtergrond">
                    Transparante achtergrond
                  </option>
                  <option value="Witte achtergrond">
                    Witte achtergrond
                  </option>
                  <option value="Transparant met lichte schaduw">
                    Transparant met lichte schaduw
                  </option>
                </select>
              </label>

              <label
                className={`${styles.field} ${styles.fieldFull}`}
              >
                <span
                  className={styles.fieldLabel}
                >
                  Aanvullende instructie
                </span>

                <textarea
                  className={styles.textarea}
                  value={instructions}
                  onChange={(event) => {
                    setInstructions(
                      event.target.value,
                    );
                    setSavedJob(null);
                  }}
                  placeholder="Bijvoorbeeld: behoud de exacte kleur, stofstructuur en pasvorm."
                  disabled={isSaving}
                />
              </label>
            </div>

            <input
              ref={fileInputRef}
              className={
                styles.hiddenFileInput
              }
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              onChange={handleFileInput}
            />

            <div
              className={`${styles.uploadZone} ${
                isDragging
                  ? styles.uploadZoneDragging
                  : ""
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
            >
              {sourceFile ? (
                <div
                  className={styles.selectedFile}
                >
                  <div
                    className={styles.uploadIcon}
                  >
                    ✓
                  </div>

                  <strong>
                    {sourceFile.name}
                  </strong>

                  <p>
                    {formatFileSize(
                      sourceFile.size,
                    )}
                    {" · "}
                    {sourceFile.type ||
                      "Afbeelding"}
                  </p>

                  <div
                    className={
                      styles.inlineActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.secondaryButton
                      }
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={isSaving}
                    >
                      Andere foto kiezen
                    </button>

                    <button
                      type="button"
                      className={
                        styles.dangerButton
                      }
                      onClick={clearFile}
                      disabled={isSaving}
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    className={styles.uploadIcon}
                  >
                    +
                  </div>

                  <strong>
                    Sleep een productfoto naar dit
                    vlak
                  </strong>

                  <p>
                    JPG, PNG, WebP, HEIC of HEIF.
                    Maximaal 15 MB.
                  </p>

                  <button
                    type="button"
                    className={
                      styles.secondaryButton
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={isSaving}
                  >
                    Foto kiezen
                  </button>
                </div>
              )}
            </div>

            {selectedArticle && sourceFile && (
              <div
                className={
                  styles.selectionSummary
                }
              >
                <div>
                  <span>Artikel</span>
                  <strong>
                    {selectedArticle.code} ·{" "}
                    {selectedArticle.name}
                  </strong>
                </div>

                <div>
                  <span>Stijl</span>
                  <strong>{presetName}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {savedJob
                      ? "Concept opgeslagen"
                      : "Klaar om op te slaan"}
                  </strong>
                </div>
              </div>
            )}

            {error && (
              <div className={styles.errorNotice}>
                {error}
              </div>
            )}

            {message && (
              <div
                className={
                  styles.successNotice
                }
              >
                {message}
              </div>
            )}

            {savedJob && (
              <PackshotGenerator
                jobId={savedJob.id}
                articleName={
                  savedJob.articleName
                }
              />
            )}

            <div className={styles.formFooter}>
              <div className={styles.fieldHint}>
                Bewerk eerst de foto rechts. Sla
                daarna de bron op en start vervolgens
                de AI-generatie.
              </div>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={
                  isSaving ||
                  !articleId ||
                  !sourceFile ||
                  articlesLoading
                }
              >
                {isSaving
                  ? "Bronfoto opslaan..."
                  : savedJob
                    ? "Opslaan als nieuwe job"
                    : "Bronfoto centraal opslaan"}
              </button>
            </div>
          </div>
        </div>
      </article>

      <aside
        className={`${styles.card} ${styles.previewPanel}`}
      >
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              Bronfoto bewerken
            </h2>
            <p
              className={
                styles.cardDescription
              }
            >
              Draai, zoom en sleep het product naar
              de gewenste positie.
            </p>
          </div>
        </div>

        <div className={styles.cardBody}>
          {previewUrl && sourceFile ? (
            <PhotoEditor
              key={`${sourceFile.name}-${editVersion}`}
              sourceUrl={previewUrl}
              sourceFileName={sourceFile.name}
              disabled={isSaving}
              onSave={handleEditedFile}
            />
          ) : (
            <div
              className={
                styles.previewPlaceholder
              }
            >
              <div>
                <strong>
                  Nog geen bronfoto
                </strong>
                <div>
                  Kies een afbeelding of sleep deze
                  naar het uploadvlak.
                </div>
              </div>
            </div>
          )}

          {savedJob && (
            <dl className={styles.jobDetails}>
              <div>
                <dt>Artikel</dt>
                <dd>
                  {savedJob.articleCode} ·{" "}
                  {savedJob.articleName}
                </dd>
              </div>

              <div>
                <dt>Status</dt>
                <dd>{savedJob.status}</dd>
              </div>

              <div>
                <dt>Bestand</dt>
                <dd>
                  {savedJob.sourceFileName}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </aside>
    </form>
  );
}
