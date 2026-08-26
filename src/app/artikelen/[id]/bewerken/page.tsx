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

  const [isSaving, setIsSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

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
    setSaveError("");
    setIsSaving(true);

    try {
      const updated = await updateProduct(
        params.id,
        input,
      );

      window.alert("Artikel succesvol opgeslagen.");
      router.push(`/artikelen/${updated.id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Het artikel kon niet worden opgeslagen.",
      );
    } finally {
      setIsSaving(false);
    }
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

      {saveError && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #e5b7b7",
            background: "#fff5f5",
            color: "#8b1e1e",
          }}
        >
          {saveError}
        </div>
      )}

      <ArticleForm
        initialProduct={product}
        submitLabel={
          isSaving
            ? "Opslaan..."
            : "Wijzigingen opslaan"
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
