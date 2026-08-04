import { ProductStudioClient } from "./components/ProductStudioClient";
import styles from "../ai-studio.module.css";

export default function ProductStudioPage() {
  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            AI Studio 1.0 · Run 2
          </p>

          <h1 className={styles.title}>
            Product Studio
          </h1>

          <p className={styles.description}>
            Selecteer een artikel uit STiTch, upload een
            iPhone-foto en sla de bron centraal op als een
            nieuwe AI Studio-opdracht.
          </p>
        </div>
      </header>

      <ProductStudioClient />
    </>
  );
}
