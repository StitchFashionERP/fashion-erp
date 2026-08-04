"use client";

import { useEffect, useState } from "react";

type Item = {
  assetId: string;
  linkId: string;
  name: string;
  versionNumber: number;
  signedUrl: string | null;
  isPrimary: boolean;
};

type Props = {
  productId: string;
};

export function MediaCenterGallery({
  productId,
}: Props) {
  const [items, setItems] =
    useState<Item[]>([]);

  async function load() {
    const response = await fetch(
      `/api/media/products/${productId}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) return;

    const body = await response.json();

    if (Array.isArray(body)) {
      setItems(body);
    }
  }

  useEffect(() => {
    void load();
  }, [productId]);

  async function makePrimary(
    assetId: string,
  ) {
    await fetch(
      `/api/media/assets/${assetId}/primary`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      },
    );

    await load();
  }

  async function unlink(
    assetId: string,
  ) {
    if (
      !confirm(
        "Deze afbeelding alleen uit dit artikel verwijderen?"
      )
    )
      return;

    await fetch(
      `/api/media/assets/${assetId}?mode=unlink&productId=${productId}`,
      {
        method: "DELETE",
      },
    );

    await load();
  }

  async function remove(
    assetId: string,
  ) {
    if (
      !confirm(
        "Deze afbeelding definitief verwijderen?"
      )
    )
      return;

    await fetch(
      `/api/media/assets/${assetId}?mode=delete`,
      {
        method: "DELETE",
      },
    );

    await load();
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        marginTop: 18,
      }}
    >
      {items.map((item) => (
        <div
          key={item.assetId}
          style={{
            border:
              "1px solid var(--border)",
            borderRadius: 6,
            padding: 14,
          }}
        >
          {item.signedUrl && (
            <img
              src={item.signedUrl}
              alt=""
              style={{
                width: 180,
                borderRadius: 4,
              }}
            />
          )}

          <div
            style={{
              marginTop: 10,
              fontWeight: 700,
            }}
          >
            {item.name}
          </div>

          <div
            style={{
              marginBottom: 10,
            }}
          >
            v{item.versionNumber}

            {item.isPrimary &&
              " ⭐ Hoofdafbeelding"}
          </div>

          {!item.isPrimary && (
            <button
              onClick={() =>
                makePrimary(
                  item.assetId,
                )
              }
            >
              Maak hoofdafbeelding
            </button>
          )}

          <button
            onClick={() =>
              unlink(item.assetId)
            }
          >
            Verwijderen uit artikel
          </button>

          <button
            onClick={() =>
              remove(item.assetId)
            }
          >
            Definitief verwijderen
          </button>
        </div>
      ))}
    </div>
  );
}
