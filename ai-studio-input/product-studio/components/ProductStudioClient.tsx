"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "../product-studio-workspace.module.css";

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
  status: string;
  presetName: string;
  sourceFileName: string;
  sourceMimeType: string;
  sourceFileSize: number;
  sourceUrl: string | null;
};

type GeneratedPackshot = {
  id: string;
  articleCode: string;
  articleName: string;
  status: string;
  presetName: string;
  provider: string;
  model: string;
  sourceUrl: string | null;
  processedSourceUrl: string | null;
  sourceConverted: boolean;
  resultUrl: string | null;
  resultPath: string;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const acceptedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function readErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error?: unknown }).error ?? fallback);
  }

  return fallback;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeArticle(value: unknown): ArticleOption | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const id = String(row.id ?? "");
  const code = String(row.code ?? row.productCode ?? row.product_code ?? "");
  const name = String(row.name ?? "");

  if (!id || !code || !name) return null;

  return {
    id,
    code,
    name,
    status: String(row.status ?? ""),
  };
}

function isHeicFile(file: File | null) {
  if (!file) return false;
  return file.type === "image/heic" || file.type === "image/heif";
}

export function ProductStudioClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState("");

  const [articleId, setArticleId] = useState("");
  const [presetName, setPresetName] = useState("Transparante achtergrond");
  const [instructions, setInstructions] = useState("");

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [savedJob, setSavedJob] = useState<SavedAiJob | null>(null);
  const [generated, setGenerated] = useState<GeneratedPackshot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      setArticlesLoading(true);
      setArticlesError("");

      try {
        const response = await fetch("/api/articles", { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(readErrorMessage(body, "Artikelen ophalen is mislukt."));
        }

        if (!Array.isArray(body)) {
          throw new Error("De artikelenrespons heeft een ongeldig formaat.");
        }

        const normalized = body
          .map(normalizeArticle)
          .filter((article): article is ArticleOption => article !== null)
          .sort((left, right) =>
            left.code.localeCompare(right.code, "nl-NL", { numeric: true }),
          );

        if (!cancelled) setArticles(normalized);
      } catch (loadError) {
        if (!cancelled) {
          setArticlesError(
            loadError instanceof Error
              ? loadError.message
              : "Artikelen ophalen is mislukt.",
          );
        }
      } finally {
        if (!cancelled) setArticlesLoading(false);
      }
    }

    void loadArticles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sourceFile || isHeicFile(sourceFile)) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(sourceFile);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [sourceFile]);

  const selectedArticle =
    articles.find((article) => article.id === articleId) ?? null;

  const sourceDisplayUrl =
    generated?.processedSourceUrl ||
    generated?.sourceUrl ||
    savedJob?.sourceUrl ||
    previewUrl;

  const progressState = generated
    ? 3
    : isGenerating
      ? 2
      : savedJob
        ? 2
        : sourceFile
          ? 1
          : 0;

  function resetOutput() {
    setSavedJob(null);
    setGenerated(null);
    setMessage("");
    setError("");
  }

  function validateAndSetFile(file: File) {
    resetOutput();

    if (!acceptedMimeTypes.has(file.type)) {
      setSourceFile(null);
      setError("Gebruik een JPG-, PNG-, WebP-, HEIC- of HEIF-afbeelding.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setSourceFile(null);
      setError("De afbeelding moet groter dan 0 bytes en maximaal 15 MB zijn.");
      return;
    }

    setSourceFile(file);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) validateAndSetFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }

  function clearFile() {
    setSourceFile(null);
    resetOutput();
  }

  async function saveSource() {
    setError("");
    setMessage("");
    setGenerated(null);

    if (!articleId || !sourceFile) {
      setError("Selecteer een artikel en een bronfoto.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set("articleId", articleId);
      formData.set("presetName", presetName);
      formData.set("instructions", instructions);
      formData.set("sourceImage", sourceFile);

      const response = await fetch("/api/ai-studio/jobs", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as
        | SavedAiJob
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "De bronfoto kon niet worden opgeslagen."),
        );
      }

      if (!body || typeof body !== "object" || !("id" in body)) {
        throw new Error("De opgeslagen opdracht heeft een ongeldig formaat.");
      }

      setSavedJob(body as SavedAiJob);
      setMessage("Bronfoto centraal opgeslagen. De AI-packshot kan nu worden gegenereerd.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Opslaan is mislukt.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generatePackshot() {
    if (!savedJob) {
      setError("Sla de bronfoto eerst centraal op.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/ai-studio/jobs/${encodeURIComponent(savedJob.id)}/generate`,
        { method: "POST" },
      );

      const body = (await response.json().catch(() => null)) as
        | GeneratedPackshot
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "De packshot kon niet worden gegenereerd."),
        );
      }

      if (!body || typeof body !== "object" || !("resultUrl" in body)) {
        throw new Error("De AI heeft een ongeldig resultaat teruggestuurd.");
      }

      const result = body as GeneratedPackshot;
      if (!result.resultUrl) {
        throw new Error("Het resultaat is opgeslagen, maar kan niet worden weergegeven.");
      }

      setGenerated(result);
      setMessage(
        result.sourceConverted
          ? "De iPhone-foto is automatisch naar PNG geconverteerd en de packshot is gereed."
          : "De packshot is gereed.",
      );
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Genereren is mislukt.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.progress}>
        {["Bronfoto", "Opgeslagen", "Packshot", "Goedkeuren", "Koppelen"].map(
          (label, index) => {
            const complete = index < progressState;
            const active = index === progressState;

            return (
              <div
                key={label}
                className={`${styles.progressStep} ${
                  complete
                    ? styles.progressStepComplete
                    : active
                      ? styles.progressStepActive
                      : ""
                }`}
              >
                <span className={styles.progressNumber}>
                  {complete ? "✓" : index + 1}
                </span>
                <span className={styles.progressLabel}>{label}</span>
              </div>
            );
          },
        )}
      </section>

      <section className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.label}>Artikel</span>
          <select
            className={styles.select}
            value={articleId}
            disabled={articlesLoading || isSaving || isGenerating}
            onChange={(event) => {
              setArticleId(event.target.value);
              resetOutput();
            }}
          >
            <option value="">
              {articlesLoading ? "Artikelen laden..." : "Selecteer een artikel"}
            </option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.code} · {article.name}
                {article.status ? ` · ${article.status}` : ""}
              </option>
            ))}
          </select>
          <span className={articlesError ? styles.errorText : styles.hint}>
            {articlesError || "Rechtstreeks geladen uit STiTch."}
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Packshotstijl</span>
          <select
            className={styles.select}
            value={presetName}
            disabled={isSaving || isGenerating}
            onChange={(event) => {
              setPresetName(event.target.value);
              resetOutput();
            }}
          >
            <option value="Transparante achtergrond">Transparante achtergrond</option>
            <option value="Witte achtergrond">Witte achtergrond</option>
            <option value="Transparant met lichte schaduw">
              Transparant met lichte schaduw
            </option>
          </select>
        </label>

        <label className={`${styles.field} ${styles.fieldFull}`}>
          <span className={styles.label}>Aanvullende instructie</span>
          <textarea
            className={styles.textarea}
            value={instructions}
            disabled={isSaving || isGenerating}
            placeholder="Alleen gebruiken voor uitzonderingen. De standaard packshotprompt staat al vast ingesteld."
            onChange={(event) => {
              setInstructions(event.target.value);
              resetOutput();
            }}
          />
        </label>
      </section>

      <section className={styles.comparison}>
        <article className={styles.imageCard}>
          <header className={styles.imageCardHeader}>
            <div>
              <strong>Originele bronfoto</strong>
              <span>Het origineel wordt nooit overschreven.</span>
            </div>
            <span className={styles.badge}>Master source</span>
          </header>

          {sourceDisplayUrl ? (
            <div className={styles.canvas}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceDisplayUrl}
                alt={selectedArticle ? `Bronfoto van ${selectedArticle.name}` : "Bronfoto"}
                className={styles.image}
              />
            </div>
          ) : sourceFile && isHeicFile(sourceFile) ? (
            <div className={styles.heicPlaceholder}>
              <div className={styles.heicIcon}>HEIC</div>
              <strong>iPhone-foto geselecteerd</strong>
              <p>
                macOS en sommige browsers tonen geen HEIC-preview. Het origineel wordt
                wel opgeslagen en bij generatie automatisch naar PNG geconverteerd.
              </p>
            </div>
          ) : (
            <div
              className={`${styles.uploadZone} ${
                isDragging ? styles.uploadZoneDragging : ""
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
              <div>
                <div className={styles.uploadIcon}>+</div>
                <strong>Sleep hier een iPhone-foto</strong>
                <p>
                  JPG, PNG, WebP, HEIC of HEIF. HEIC wordt automatisch voor de AI
                  geconverteerd.
                </p>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Foto kiezen
                </button>
              </div>
            </div>
          )}

          <footer className={styles.imageCardFooter}>
            <div className={styles.fileMeta}>
              <strong>
                {sourceFile?.name || savedJob?.sourceFileName || "Nog geen bestand"}
              </strong>
              <span>
                {sourceFile
                  ? `${formatFileSize(sourceFile.size)} · ${sourceFile.type}`
                  : "Kies een foto om te starten."}
              </span>
            </div>

            <div className={styles.actions}>
              {sourceFile && (
                <>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={isSaving || isGenerating}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Andere foto
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={isSaving || isGenerating}
                    onClick={clearFile}
                  >
                    Verwijderen
                  </button>
                </>
              )}
            </div>
          </footer>
        </article>

        <div className={styles.connector}>
          <div className={styles.connectorCircle}>→</div>
        </div>

        <article className={styles.imageCard}>
          <header className={styles.imageCardHeader}>
            <div>
              <strong>AI-packshot</strong>
              <span>Het nieuwste gegenereerde resultaat.</span>
            </div>
            <span
              className={`${styles.badge} ${
                generated
                  ? styles.badgeSuccess
                  : isGenerating
                    ? styles.badgeProcessing
                    : ""
              }`}
            >
              {generated ? "Gereed" : isGenerating ? "Bezig" : "Wachten"}
            </span>
          </header>

          <div className={styles.canvas}>
            {generated?.resultUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={generated.resultUrl}
                alt={`AI-packshot van ${generated.articleName}`}
                className={styles.image}
              />
            ) : (
              <div className={styles.emptyCanvas}>
                {isGenerating ? (
                  <>
                    <span className={styles.spinner} />
                    <strong>Packshot wordt gegenereerd</strong>
                    <p>Een HEIC-bestand wordt eerst automatisch naar PNG geconverteerd.</p>
                  </>
                ) : (
                  <>
                    <strong>Nog geen AI-resultaat</strong>
                    <p>Sla de bronfoto op en start daarna de generatie.</p>
                  </>
                )}
              </div>
            )}
          </div>

          <footer className={styles.imageCardFooter}>
            <div className={styles.fileMeta}>
              <strong>{generated ? "packshot.png" : "Geen resultaat"}</strong>
              <span>
                {generated ? `${generated.provider} · ${generated.model}` : presetName}
              </span>
            </div>
            <div className={styles.actions}>
              {generated && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={generatePackshot}
                  disabled={isGenerating}
                >
                  Opnieuw genereren
                </button>
              )}
            </div>
          </footer>
        </article>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        className={styles.hiddenInput}
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        onChange={handleFileInput}
      />

      <section className={styles.statusPanel}>
        <header className={styles.statusHeader}>
          <div>
            <strong>Opdracht</strong>
            <p>
              Het origineel blijft bewaard. Alleen wanneer nodig maakt STiTch een aparte
              AI-versie.
            </p>
          </div>
          <div className={styles.actions}>
            {!savedJob ? (
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!articleId || !sourceFile || isSaving}
                onClick={saveSource}
              >
                {isSaving ? "Bronfoto opslaan..." : "Bronfoto centraal opslaan"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                disabled={isGenerating}
                onClick={generatePackshot}
              >
                {isGenerating ? "Packshot genereren..." : "Maak AI-packshot"}
              </button>
            )}
          </div>
        </header>

        <div className={styles.statusGrid}>
          <div>
            <span>Artikel</span>
            <strong>
              {selectedArticle
                ? `${selectedArticle.code} · ${selectedArticle.name}`
                : "Niet geselecteerd"}
            </strong>
          </div>
          <div>
            <span>Bron</span>
            <strong>{sourceFile ? sourceFile.type : "Niet gekozen"}</strong>
          </div>
          <div>
            <span>Conversie</span>
            <strong>
              {generated?.sourceConverted
                ? "HEIC → PNG voltooid"
                : isHeicFile(sourceFile)
                  ? "Automatisch bij generatie"
                  : "Niet nodig"}
            </strong>
          </div>
          <div>
            <span>Status</span>
            <strong>
              {generated
                ? "Packshot gereed"
                : isGenerating
                  ? "AI is bezig"
                  : savedJob
                    ? "Klaar voor AI"
                    : sourceFile
                      ? "Klaar om op te slaan"
                      : "Wachten op bronfoto"}
            </strong>
          </div>
        </div>

        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.notice}>
          Goedkeuren, versiebeheer en koppelen aan de artikelkaart volgen in Run 4.
        </div>
      </section>
    </div>
  );
}
