import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { NewArticleWizard } from "@/components/articles/new-article-wizard";
import styles from "./new-article.module.css";

export default function NewArticlePage() {
  return <div><div className={styles.breadcrumb}><Link href="/artikelen">Artikelen</Link><span>›</span><span>Nieuw artikel</span></div><PageHeader eyebrow="Producten" title="Nieuw artikel" description="Maak in vijf eenvoudige stappen een compleet artikel met kleuren, maten en unieke SKU's."/><NewArticleWizard /></div>;
}
