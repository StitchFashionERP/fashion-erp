import { AiAssetLibraryClient } from "./components/AiAssetLibraryClient";
import styles from "../ai-studio.module.css";

export default function AiStudioLibraryPage() {
  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            Centrale beeldbibliotheek
          </p>

          <h1 className={styles.title}>
            AI Bibliotheek
          </h1>

          <p className={styles.description}>
            Alle voltooide AI-generaties worden hier
            automatisch zichtbaar. Goedkeuren, versiebeheer
            en koppelen aan artikelen volgen in de volgende
            fase.
          </p>
        </div>
      </header>

      <AiAssetLibraryClient />
    </>
  );
}
