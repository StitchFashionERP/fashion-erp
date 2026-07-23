"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  getStoredProducts,
  type Product,
} from "@/lib/articles";
import {
  getCollections,
  getSuppliers,
  type Supplier,
} from "@/lib/master-data";
import {
  createProductionOrder,
  type ProductionOrderStatus,
} from "@/lib/production";
import styles from "./new-production.module.css";

export default function NewProductionOrderPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<
    Supplier[]
  >([]);
  const [products, setProducts] = useState<
    Product[]
  >([]);
  const [collections, setCollections] = useState<
    string[]
  >([]);

  const [supplierId, setSupplierId] =
    useState("");
  const [collectionCode, setCollectionCode] =
    useState("");
  const [supplierReference, setSupplierReference] =
    useState("");
  const [
    expectedDeliveryDate,
    setExpectedDeliveryDate,
  ] = useState("");
  const [status, setStatus] =
    useState<ProductionOrderStatus>("Concept");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] =
    useState<Record<string, number>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const supplierValues = getSuppliers().filter(
      (item) => item.status === "Actief",
    );

    const collectionValues = getCollections()
      .filter(
        (item) => item.status !== "Gearchiveerd",
      )
      .map((item) => item.code);

    setSuppliers(supplierValues);
    setProducts(getStoredProducts());
    setCollections(collectionValues);
    setSupplierId(supplierValues[0]?.id || "");
    setCollectionCode(
      collectionValues[0] || "",
    );
  }, []);

  const supplier = suppliers.find(
    (item) => item.id === supplierId,
  );

  const variants = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products
      .filter(
        (product) =>
          (!collectionCode ||
            product.collection ===
              collectionCode) &&
          (!supplier ||
            product.supplier ===
              supplier.companyName),
      )
      .flatMap((product) =>
        product.variants.map((variant) => ({
          product,
          variant,
        })),
      )
      .filter(({ product, variant }) =>
        !query
          ? true
          : [
              product.code,
              product.name,
              variant.sku,
              variant.color,
              variant.size,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query),
      );
  }, [
    products,
    collectionCode,
    supplier,
    search,
  ]);

  const selected = variants.filter(
    ({ variant }) =>
      (quantities[variant.id] || 0) > 0,
  );

  function save() {
    try {
      if (!supplier) {
        throw new Error(
          "Selecteer een leverancier.",
        );
      }

      const order = createProductionOrder({
        supplierId: supplier.id,
        supplierName: supplier.companyName,
        supplierReference,
        collectionCode,
        expectedDeliveryDate,
        status,
        notes,
        lines: selected.map(
          ({ product, variant }) => ({
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            variantId: variant.id,
            sku: variant.sku,
            color: variant.color,
            size: variant.size,
            orderedQuantity:
              quantities[variant.id],
            purchasePrice:
              variant.purchasePrice,
          }),
        ),
      });

      router.push(`/productie/${order.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Opslaan is niet gelukt.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Productie"
        title="Nieuwe productieorder"
        description="Kies leverancier, collectie, leverdatum en aantallen per variant."
      />

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <section className={styles.grid}>
        <article className="content-card">
          <div className={styles.formGrid}>
            <label>
              <span>Leverancier</span>
              <select
                value={supplierId}
                onChange={(event) =>
                  setSupplierId(
                    event.target.value,
                  )
                }
              >
                {suppliers.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.companyName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Collectie</span>
              <select
                value={collectionCode}
                onChange={(event) =>
                  setCollectionCode(
                    event.target.value,
                  )
                }
              >
                {collections.map((item) => (
                  <option key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Referentie leverancier</span>
              <input
                value={supplierReference}
                onChange={(event) =>
                  setSupplierReference(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Geplande leverdatum</span>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(event) =>
                  setExpectedDeliveryDate(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as ProductionOrderStatus,
                  )
                }
              >
                <option>Concept</option>
                <option>Besteld</option>
                <option>In productie</option>
              </select>
            </label>

            <label className={styles.fullWidth}>
              <span>Opmerkingen</span>
              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
              />
            </label>
          </div>
        </article>

        <article className="content-card">
          <div className={styles.summary}>
            <span>Geselecteerd</span>
            <strong>
              {selected.reduce(
                (total, { variant }) =>
                  total +
                  (quantities[variant.id] || 0),
                0,
              )}{" "}
              stuks
            </strong>
            <span>
              {selected.length} varianten
            </span>
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-toolbar">
          <div className="table-search">
            <span>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Zoek artikel, SKU, kleur of maat..."
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>SKU</th>
                <th>Kleur</th>
                <th>Maat</th>
                <th className="table-number">
                  Inkoopprijs
                </th>
                <th className="table-number">
                  Aantal
                </th>
              </tr>
            </thead>

            <tbody>
              {variants.map(
                ({ product, variant }) => (
                  <tr key={variant.id}>
                    <td className="table-primary">
                      {product.code} ·{" "}
                      {product.name}
                    </td>
                    <td>{variant.sku}</td>
                    <td>{variant.color}</td>
                    <td>{variant.size}</td>
                    <td className="table-number">
                      €{" "}
                      {variant.purchasePrice.toLocaleString(
                        "nl-NL",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>
                    <td className="table-number">
                      <input
                        className={
                          styles.quantityInput
                        }
                        type="number"
                        min={0}
                        value={
                          quantities[variant.id] ||
                          ""
                        }
                        onChange={(event) =>
                          setQuantities(
                            (current) => ({
                              ...current,
                              [variant.id]:
                                Math.max(
                                  0,
                                  Number(
                                    event.target
                                      .value,
                                  ) || 0,
                                ),
                            }),
                          )
                        }
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className="button button-primary"
          onClick={save}
        >
          Productieorder opslaan
        </button>
      </div>
    </div>
  );
}
