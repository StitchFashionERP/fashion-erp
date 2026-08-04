import Link from "next/link";
import { AiAssetLibraryClient } from "../components/AiAssetLibraryClient";
import styles from "../../ai-studio.module.css";

type PageProps = {
  params: Promise<{
    articleId: string;
  }>;
};

export default async function ArticleMediaPage({
  params,
}: PageProps) {
  const { articleId } = await params;

  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            Artikelmedia
          </p>

          <h1 className={styles.title}>
            Afbeeldingen en versies
          </h1>

          <p className={styles.description}>
            Beheer de hoofdafbeelding,
            subafbeeldingen en AI-versies van dit
            artikel.
          </p>

          <Link
            href="/ai-studio/bibliotheek"
            className={styles.secondaryButton}
          >
            ← Terug naar beeldbank
          </Link>
        </div>
      </header>

      <AiAssetLibraryClient
        articleId={decodeURIComponent(articleId)}
      />
    </>
  );
}
