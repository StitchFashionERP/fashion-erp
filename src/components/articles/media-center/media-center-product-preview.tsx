"use client";

import { useEffect, useState } from "react";
import styles from "./media-center-product-preview.module.css";

type MediaCenterItem = {
  assetId: string;
  name: string;
  category: string;
  status: string;
  origin: string;
  versionNumber: number;
  isPrimary: boolean;
  signedUrl: string | null;
};

type Props = {
  productId: string;
  productName: string;
};

export function MediaCenterProductPreview({
  productId,
  productName,
}: Props) {
  const [items, setItems] = useState<MediaCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/media/products/${encodeURIComponent(productId)}`,
          { cache: "no-store" },
        );

        const body = (await response
          .json()
          .catch(() => null)) as unknown;

        if (!response.ok) {
          const message =
            body &&
            typeof body === "object" &&
            "error" in body
              ? String((body as { error?: unknown }).error)
              : "Media Center kon niet worden geladen.";

          throw new Error(message);
        }

        if (!Array.isArray(body)) {
          throw new Error(
            "Media Center heeft een ongeldig resultaat teruggestuurd.",
          );
        }

        if (!cancelled) {
          setItems(body as MediaCenterItem[]);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Media Center kon niet worden geladen.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMedia();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const primary =
    items.find((item) => item.isPrimary && item.signedUrl) ??
    items.find((item) => item.signedUrl) ??
    null;

  if (loading) {
    return (
      <div className={styles.loading}>
        Media Center-afbeelding laden...
      </div>
    );
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!primary?.signedUrl) {
    return null;
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <strong>Media Center</strong>
          <span>
            Goedgekeurde afbeelding uit AI Studio
          </span>
        </div>

        <div className={styles.badges}>
          {primary.isPrimary && (
            <span className={styles.primaryBadge}>
              Hoofdafbeelding
            </span>
          )}

          <span className={styles.versionBadge}>
            v{primary.versionNumber}
          </span>
        </div>
      </header>

      <div className={styles.preview}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primary.signedUrl}
          alt={`${productName} - ${primary.name}`}
        />
      </div>

      <footer className={styles.footer}>
        <strong>{primary.name}</strong>
        <span>
          {primary.category} · {primary.origin}
        </span>
      </footer>
    </section>
  );
}
