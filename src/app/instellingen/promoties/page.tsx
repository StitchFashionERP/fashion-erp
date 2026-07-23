"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts } from "@/lib/articles";
import {
  createPricingPromotion,
  deletePricingPromotion,
  getPricingPromotions,
  type PricingPromotion,
} from "@/lib/pricing-promotions";
import styles from "./promotions.module.css";

export default function PromotionsPage() {
  const products = useMemo(
    () => getStoredProducts(),
    [],
  );
  const [items, setItems] = useState<
    PricingPromotion[]
  >([]);
  const [name, setName] = useState("");
  const [productId, setProductId] =
    useState("");
  const [discount, setDiscount] = useState("0");
  const [fixedPrice, setFixedPrice] =
    useState("0");
  const [validFrom, setValidFrom] =
    useState("");
  const [validUntil, setValidUntil] =
    useState("");
  const [priority, setPriority] = useState("10");

  function reload() {
    setItems(getPricingPromotions());
  }

  useEffect(reload, []);

  function create() {
    if (!name.trim() || !validFrom) return;

    createPricingPromotion({
      name: name.trim(),
      productId,
      variantId: "",
      customerId: "",
      priceListId: "",
      discountPercentage:
        Number(discount.replace(",", ".")) || 0,
      fixedPrice:
        Number(fixedPrice.replace(",", ".")) || 0,
      validFrom,
      validUntil,
      priority: Number(priority) || 0,
      isActive: true,
    });

    setName("");
    setProductId("");
    setDiscount("0");
    setFixedPrice("0");
    setValidFrom("");
    setValidUntil("");
    reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pricing Engine"
        title="Promoties"
        description="Plan tijdelijke kortingen of vaste actieprijzen."
      />

      <section className={styles.grid}>
        <article className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">
              Nieuwe promotie
            </h2>
          </div>

          <div className={styles.form}>
            <label>
              <span>Naam</span>
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </label>

            <label>
              <span>Artikel (optioneel)</span>
              <select
                value={productId}
                onChange={(event) =>
                  setProductId(event.target.value)
                }
              >
                <option value="">
                  Alle artikelen
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
              <span>Korting %</span>
              <input
                type="number"
                step="0.1"
                value={discount}
                onChange={(event) =>
                  setDiscount(event.target.value)
                }
              />
            </label>

            <label>
              <span>Vaste prijs excl. btw</span>
              <input
                type="number"
                step="0.01"
                value={fixedPrice}
                onChange={(event) =>
                  setFixedPrice(event.target.value)
                }
              />
            </label>

            <label>
              <span>Vanaf</span>
              <input
                type="date"
                value={validFrom}
                onChange={(event) =>
                  setValidFrom(event.target.value)
                }
              />
            </label>

            <label>
              <span>Tot</span>
              <input
                type="date"
                value={validUntil}
                onChange={(event) =>
                  setValidUntil(event.target.value)
                }
              />
            </label>

            <label>
              <span>Prioriteit</span>
              <input
                type="number"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value)
                }
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className="button button-primary"
              onClick={create}
            >
              Promotie opslaan
            </button>
          </div>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">
              Prijsvolgorde
            </h2>
          </div>
          <div className={styles.info}>
            <ol>
              <li>Klantspecifieke prijs</li>
              <li>Prijslijststaffel</li>
              <li>Promotie</li>
              <li>Toekomstige prijs</li>
              <li>Prijslijstaanpassing</li>
              <li>Artikelprijs</li>
            </ol>
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Artikel</th>
                <th>Korting</th>
                <th>Vaste prijs</th>
                <th>Periode</th>
                <th>Prioriteit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const product = products.find(
                  (entry) =>
                    entry.id === item.productId,
                );
                return (
                  <tr key={item.id}>
                    <td className="table-primary">
                      {item.name}
                    </td>
                    <td>
                      {product
                        ? `${product.code} · ${product.name}`
                        : "Alle artikelen"}
                    </td>
                    <td>
                      {item.discountPercentage}%
                    </td>
                    <td>
                      {item.fixedPrice > 0
                        ? `€ ${item.fixedPrice.toFixed(
                            2,
                          )}`
                        : "—"}
                    </td>
                    <td>
                      {item.validFrom} –{" "}
                      {item.validUntil || "onbeperkt"}
                    </td>
                    <td>{item.priority}</td>
                    <td>
                      <button
                        type="button"
                        className={
                          styles.deleteButton
                        }
                        onClick={() => {
                          deletePricingPromotion(
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
      </section>
    </div>
  );
}
