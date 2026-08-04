import Link from "next/link";
import styles from "../../ai-studio.module.css";

export function WorkspaceHeader() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>
          AI Studio 1.0
        </p>

        <h1 className={styles.title}>
          Workspace
        </h1>

        <p className={styles.description}>
          Bewaar de originele productfoto, genereer een
          professionele packshot en koppel het goedgekeurde
          resultaat daarna rechtstreeks aan een artikel.
        </p>
      </div>

      <div className={styles.heroActions}>
        <Link
          href="/ai-studio/bibliotheek"
          className={styles.secondaryButton}
        >
          Open bibliotheek
        </Link>

        <Link
          href="/ai-studio/referenties"
          className={styles.secondaryButton}
        >
          Open referenties
        </Link>
      </div>
    </header>
  );
}
