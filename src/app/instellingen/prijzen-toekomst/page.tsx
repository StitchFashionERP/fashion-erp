"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts } from "@/lib/articles";
import {
  createScheduledArticlePrice,
  deleteScheduledArticlePrice,
  getScheduledArticlePrices,
  updateScheduledArticlePrice,
  type ScheduledArticlePrice,
} from "@/lib/scheduled-prices";
import styles from "./future-prices.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function date(value: string) {
  if (!value) {
    return "Onbeperkt";
  }

  return new Intl.DateTimeFormat("nl-NL").format(
    new Date(`${value}T12:00:00`),
  );
}

export default function FuturePricesPage() {
  const products = useMemo(
    () => getStoredProducts(),
    [],
  );

  const [items, setItems] = useState<
    ScheduledArticlePrice[]
  >([]);
  const [productId, setProductId] =
    useState("");
  const [variantId, setVariantId] =
    useState("");
  const [salesPrice, setSalesPrice] =
    useState("");
  const [
    recommendedRetailPrice,
    setRecommendedRetailPrice,
  ] = useState("");
  const [validFrom, setValidFrom] =
    useState("");
  const [validUntil, setValidUntil] =
    useState("");
  const [note, setNote] = useState("");

  const selectedProduct = products.find(
    (item) => item.id === productId,
  );

  function reload() {
    setItems(getScheduledArticlePrices());
  }

  useEffect(() => {
    reload();
  }, []);

  function handleProductChange(value: string) {
    setProductId(value);
    setVariantId("");

    const product = products.find(
      (item) => item.id === value,
    );

    if (product) {
      setSalesPrice(
        String(product.wholesalePrice || ""),
      );
      setRecommendedRetailPrice(
        String(
          product.recommendedRetailPrice || "",
        ),
      );
    }
  }

  function addScheduledPrice() {
    if (
      !productId ||
      !validFrom ||
      !salesPrice ||
      !recommendedRetailPrice
    ) {
      return;
    }

    createScheduledArticlePrice({
      productId,
      variantId,
      salesPrice: Number(
        salesPrice.replace(",", "."),
      ),
      recommendedRetailPrice: Number(
        recommendedRetailPrice.replace(",", "."),
      ),
      validFrom,
      validUntil,
      note,
    });

    setProductId("");
    setVariantId("");
    setSalesPrice("");
    setRecommendedRetailPrice("");
    setValidFrom("");
    setValidUntil("");
    setNote("");
    reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pricing Engine"
        title="Toekomstige prijzen"
        description="Plan nieuwe verkoop- en adviesprijzen met een ingangsdatum."
      />

      <section className={styles.grid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Nieuwe prijswijziging
              </h2>
              <p className="content-card-description">
                De geplande prijs wordt automatisch
                gebruikt voor orders met een datum
                binnen de geldigheid.
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Artikel</span>
              <select
                value={productId}
                onChange={(event) =>
                  handleProductChange(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Selecteer artikel
                </option>
                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.code} · {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Variant (optioneel)</span>
              <select
                value={variantId}
                onChange={(event) =>
                  setVariantId(event.target.value)
                }
                disabled={!selectedProduct}
              >
                <option value="">
                  Alle varianten
                </option>
                {selectedProduct?.variants.map(
                  (variant) => (
                    <option
                      key={variant.id}
                      value={variant.id}
                    >
                      {variant.color} ·{" "}
                      {variant.size} · {variant.sku}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                Verkoopprijs excl. btw
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={salesPrice}
                onChange={(event) =>
                  setSalesPrice(event.target.value)
                }
              />
            </label>

            <label>
              <span>
                Adviesverkoopprijs incl. btw
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={recommendedRetailPrice}
                onChange={(event) =>
                  setRecommendedRetailPrice(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Geldig vanaf</span>
              <input
                type="date"
                value={validFrom}
                onChange={(event) =>
                  setValidFrom(event.target.value)
                }
              />
            </label>

            <label>
              <span>Geldig tot (optioneel)</span>
              <input
                type="date"
                value={validUntil}
                onChange={(event) =>
                  setValidUntil(event.target.value)
                }
              />
            </label>

            <label className={styles.fullWidth}>
              <span>Notitie</span>
              <input
                type="text"
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="Bijv. prijswijziging AW27"
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className="button button-primary"
              onClick={addScheduledPrice}
            >
              Prijswijziging plannen
            </button>
          </div>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Werking
              </h2>
            </div>
          </div>

          <div className={styles.info}>
            <strong>Prijsvolgorde</strong>
            <ol>
              <li>Klantspecifieke prijs</li>
              <li>Prijslijststaffel</li>
              <li>Toekomstige artikelprijs</li>
              <li>Prijslijstaanpassing</li>
              <li>Standaard artikelprijs</li>
            </ol>

            <p>
              Een specifieke klantafspraak blijft
              dus altijd leidend. Daarna kijkt de
              engine naar geplande prijzen en de
              gekoppelde prijslijst.
            </p>
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Geplande prijswijzigingen
            </h2>
            <p className="content-card-description">
              Actieve en toekomstige prijsperiodes.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Variant</th>
                <th className="table-number">
                  Verkoopprijs
                </th>
                <th className="table-number">
                  Adviesprijs
                </th>
                <th>Geldigheid</th>
                <th>Status</th>
                <th>Notitie</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const product = products.find(
                  (entry) =>
                    entry.id === item.productId,
                );

                const variant =
                  product?.variants.find(
                    (entry) =>
                      entry.id === item.variantId,
                  );

                return (
                  <tr key={item.id}>
                    <td className="table-primary">
                      {product
                        ? `${product.code} · ${product.name}`
                        : "Onbekend artikel"}
                    </td>

                    <td>
                      {variant
                        ? `${variant.color} · ${variant.size}`
                        : "Alle varianten"}
                    </td>

                    <td className="table-number">
                      {money(item.salesPrice)}
                    </td>

                    <td className="table-number">
                      {money(
                        item.recommendedRetailPrice,
                      )}
                    </td>

                    <td>
                      {date(item.validFrom)} –{" "}
                      {date(item.validUntil)}
                    </td>

                    <td>
                      <label
                        className={
                          styles.statusToggle
                        }
                      >
                        <input
                          type="checkbox"
                          checked={item.isActive}
                          onChange={(event) => {
                            updateScheduledArticlePrice(
                              item.id,
                              {
                                isActive:
                                  event.target.checked,
                              },
                            );
                            reload();
                          }}
                        />
                        {item.isActive
                          ? "Actief"
                          : "Uitgeschakeld"}
                      </label>
                    </td>

                    <td>{item.note || "—"}</td>

                    <td className="table-number">
                      <button
                        type="button"
                        className={
                          styles.deleteButton
                        }
                        onClick={() => {
                          deleteScheduledArticlePrice(
                            item.id,
                          );
                          reload();
                        }}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className={styles.empty}>
            Nog geen toekomstige prijzen gepland.
          </div>
        )}
      </section>
    </div>
  );
}
