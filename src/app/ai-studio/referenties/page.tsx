import { aiStudioDemoReferences } from "@/lib/ai-studio/demo-data";
import styles from "../ai-studio.module.css";

function categoryLabel(category: string) {
  if (category === "PACKSHOT") return "Packshot";
  if (category === "MODEL") return "Model";
  if (category === "LIFESTYLE") return "Lifestyle";
  return "Campagne";
}

export default function ReferencesPage() {
  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            Stijl en seizoenen
          </p>
          <h1 className={styles.title}>
            Referentiebibliotheek
          </h1>
          <p className={styles.description}>
            Bewaar voorbeeldbeelden voor packshots, modellen,
            lifestylebeelden en campagnes. Referenties kunnen per
            seizoen verschillen.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled
          >
            Referentie uploaden · Run 2
          </button>
        </div>
      </header>

      <section className={styles.referenceGrid}>
        {aiStudioDemoReferences.map((reference) => (
          <article
            key={reference.id}
            className={styles.assetCard}
          >
            <div className={styles.assetPreview}>
              Voorbeeldbeeld volgt
            </div>

            <div className={styles.assetContent}>
              <strong>{reference.name}</strong>
              <div className={styles.assetMeta}>
                {categoryLabel(reference.category)}
                {" · "}
                {reference.season}
              </div>

              <div className={styles.tagList}>
                {reference.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
