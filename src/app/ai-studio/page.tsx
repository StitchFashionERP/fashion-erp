import Link from "next/link";
import { aiStudioDemoJobs } from "@/lib/ai-studio/demo-data";
import type {
  AiStudioJobStatus,
  AiStudioJobType,
} from "@/lib/ai-studio/types";
import styles from "./ai-studio.module.css";

function jobTypeLabel(type: AiStudioJobType) {
  if (type === "PRODUCT_SHOT") return "Packshot";
  if (type === "MODEL_SHOT") return "Modelfoto";
  return "Bronfoto verbeteren";
}

function jobStatusLabel(status: AiStudioJobStatus) {
  if (status === "CONCEPT") return "Concept";
  if (status === "QUEUED") return "Wachtrij";
  if (status === "PROCESSING") return "Bezig";
  if (status === "COMPLETED") return "Gereed";
  return "Mislukt";
}

function jobStatusClass(status: AiStudioJobStatus) {
  if (status === "CONCEPT") return styles.statusConcept;
  if (status === "QUEUED") return styles.statusQueued;
  if (status === "PROCESSING") return styles.statusProcessing;
  if (status === "COMPLETED") return styles.statusCompleted;
  return styles.statusFailed;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AiStudioPage() {
  const completed = aiStudioDemoJobs.filter(
    (job) => job.status === "COMPLETED",
  ).length;

  const active = aiStudioDemoJobs.filter(
    (job) =>
      job.status === "PROCESSING" ||
      job.status === "QUEUED",
  ).length;

  const failed = aiStudioDemoJobs.filter(
    (job) => job.status === "FAILED",
  ).length;

  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            Creatieve beeldproductie
          </p>
          <h1 className={styles.title}>
            AI Studio
          </h1>
          <p className={styles.description}>
            Maak vanuit eenvoudige productfoto’s professionele
            packshots, modelfoto’s en campagnebeelden. Koppel
            goedgekeurde resultaten daarna direct aan artikelen
            in STiTch.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link
            href="/ai-studio/workspace"
            className={styles.primaryButton}
          >
            Open workspace
          </Link>
          <Link
            href="/ai-studio/referenties"
            className={styles.secondaryButton}
          >
            Referenties beheren
          </Link>
        </div>
      </header>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            AI-opdrachten
          </div>
          <div className={styles.kpiValue}>
            {aiStudioDemoJobs.length}
          </div>
          <div className={styles.kpiMeta}>
            Demo-opdrachten in deze foundation
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            Actief
          </div>
          <div className={styles.kpiValue}>
            {active}
          </div>
          <div className={styles.kpiMeta}>
            In wachtrij of in verwerking
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            Gereed
          </div>
          <div className={styles.kpiValue}>
            {completed}
          </div>
          <div className={styles.kpiMeta}>
            Klaar voor beoordeling
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            Aandacht nodig
          </div>
          <div className={styles.kpiValue}>
            {failed}
          </div>
          <div className={styles.kpiMeta}>
            Mislukte opdrachten
          </div>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>
                Recente AI-opdrachten
              </h2>
              <p className={styles.cardDescription}>
                Overzicht van de laatste beeldgeneraties.
              </p>
            </div>
          </div>

          <div>
            <table className={styles.jobTable}>
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>Type</th>
                  <th>Preset</th>
                  <th>Status</th>
                  <th>Aangemaakt</th>
                </tr>
              </thead>
              <tbody>
                {aiStudioDemoJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className={styles.jobPrimary}>
                        {job.articleName}
                      </div>
                      <div className={styles.jobSecondary}>
                        {job.articleCode}
                      </div>
                    </td>
                    <td>{jobTypeLabel(job.type)}</td>
                    <td>{job.presetName}</td>
                    <td>
                      <span
                        className={`${styles.status} ${jobStatusClass(
                          job.status,
                        )}`}
                      >
                        {jobStatusLabel(job.status)}
                      </span>
                    </td>
                    <td>{formatDate(job.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>
                Snel starten
              </h2>
              <p className={styles.cardDescription}>
                Kies de gewenste workflow.
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.quickActions}>
              <Link
                href="/ai-studio/workspace"
                className={styles.quickAction}
              >
                <div>
                  <strong>Product Studio</strong>
                  <span>
                    Maak een packshot met transparante achtergrond.
                  </span>
                </div>
                <div className={styles.quickActionArrow}>›</div>
              </Link>

              <Link
                href="/ai-studio/model-studio"
                className={styles.quickAction}
              >
                <div>
                  <strong>Model Studio</strong>
                  <span>
                    Plaats een kledingstuk op een digitaal model.
                  </span>
                </div>
                <div className={styles.quickActionArrow}>›</div>
              </Link>

              <Link
                href="/ai-studio/referenties"
                className={styles.quickAction}
              >
                <div>
                  <strong>Referenties</strong>
                  <span>
                    Beheer stijlen per seizoen en beeldtype.
                  </span>
                </div>
                <div className={styles.quickActionArrow}>›</div>
              </Link>

              <Link
                href="/ai-studio/bibliotheek"
                className={styles.quickAction}
              >
                <div>
                  <strong>Bibliotheek</strong>
                  <span>
                    Bekijk goedgekeurde en gegenereerde beelden.
                  </span>
                </div>
                <div className={styles.quickActionArrow}>›</div>
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
