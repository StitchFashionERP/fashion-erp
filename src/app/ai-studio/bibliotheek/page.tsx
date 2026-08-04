import { AiAssetLibraryOverviewClient } from "./components/AiAssetLibraryOverviewClient";
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
            Bekijk per artikel de hoofdafbeelding,
            productnaam en het artikelnummer. Open
            een artikel voor de galerij en volledige
            AI-versiegeschiedenis.
          </p>
        </div>
      </header>

      <AiAssetLibraryOverviewClient />
    </>
  );
}
