"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ArticleForm } from "@/components/articles/article-form-fixed";
import {
  fetchProductById,
  updateProduct,
  type Product,
  type ProductInput,
} from "@/lib/articles";
import styles from "./edit-article.module.css";

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] =
    useState<Product | null>(null);
  const [isLoaded, setIsLoaded] =
    useState(false);

  useEffect(() => {
    let active = true;
    void fetchProductById(params.id)
      .then((loaded) => {
        if (active) setProduct(loaded);
      })
      .finally(() => {
        if (active) setIsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  async function handleSubmit(input: ProductInput) {
    const updated = await updateProduct(
      params.id,
      input,
    );

    window.alert("Artikel succesvol opgeslagen.");
    router.push(`/artikelen/${updated.id}`);
  }

  if (!isLoaded) {
    return (
      <section className="content-card">
        <div className={styles.loading}>
          Artikel laden...
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="content-card">
        <div className={styles.notFound}>
          <h1>Artikel niet gevonden</h1>

          <Link
            href="/artikelen"
            className="button button-primary"
          >
            Terug naar artikelen
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/artikelen">
          Artikelen
        </Link>
        <span>›</span>

        <Link href={`/artikelen/${product.id}`}>
          {product.name}
        </Link>

        <span>›</span>
        <span>Bewerken</span>
      </div>

      <PageHeader
        eyebrow={product.code}
        title={`${product.name} bewerken`}
        description="Wijzig productgegevens, prijzen, varianten en beginvoorraad."
      />

      <ArticleForm
        initialProduct={product}
        submitLabel="Wijzigingen opslaan"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
