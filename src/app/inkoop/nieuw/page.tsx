"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts } from "@/lib/articles";
import {
  getCollections,
  getSuppliers,
  type Supplier,
} from "@/lib/master-data";
import {
  createPurchaseOrder,
  type PurchaseOrderLine,
  type PurchaseOrderStatus,
} from "@/lib/purchasing";
import styles from "./new-purchase-order.module.css";

type SelectableLine = Omit<
  PurchaseOrderLine,
  "id" | "receivedQuantity"
>;

export default function NewPurchaseOrderPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<
    Supplier[]
  >([]);
  const [collections, setCollections] = useState<
    string[]
  >([]);

  const [supplierId, setSupplierId] =
    useState("");
  const [collectionCode, setCollectionCode] =
    useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] =
    useState("");
  const [status, setStatus] =
    useState<PurchaseOrderStatus>("Concept");
  const [notes, setNotes] = useState("");

  const [allLines, setAllLines] = useState<
    SelectableLine[]
  >([]);
  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supplierValues = getSuppliers().filter(
      (item) => item.status === "Actief",
    );

    const collectionValues = getCollections()
      .filter((item) => item.status !== "Gearchiveerd")
      .map((item) => item.code);

    setSuppliers(supplierValues);
    setCollections(collectionValues);

    setSupplierId(supplierValues[0]?.id ?? "");
    setCollectionCode(
      collectionValues[0] ?? "",
    );
  }, []);

  useEffect(() => {
    const products = getStoredProducts();

    const lines = products.flatMap((product) =>
      product.variants.map((variant) => ({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        variantId: variant.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        orderedQuantity: 0,
        purchasePrice: variant.purchasePrice,
      })),
    );

    setAllLines(lines);
  }, []);

  const filteredLines = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allLines.filter((line) => {
      const matchesSearch =
        !query ||
        line.productName
          .toLowerCase()
          .includes(query) ||
        line.productCode
          .toLowerCase()
          .includes(query) ||
        line.sku.toLowerCase().includes(query);

      const product = getStoredProducts().find(
        (item) => item.id === line.productId,
      );

      const matchesCollection =
        !collectionCode ||
        product?.collection === collectionCode;

      const matchesSupplier =
        !supplierId ||
        product?.supplier ===
          suppliers.find(
            (supplier) =>
              supplier.id === supplierId,
          )?.companyName;

      return (
        matchesSearch &&
        matchesCollection &&
        matchesSupplier
      );
    });
  }, [
    allLines,
    search,
    collectionCode,
    supplierId,
    suppliers,
  ]);

  const selectedLines = allLines
    .filter(
      (line) =>
        (quantities[line.variantId] ?? 0) > 0,
    )
    .map((line) => ({
      ...line,
      orderedQuantity:
        quantities[line.variantId] ?? 0,
    }));

  const totalQuantity = selectedLines.reduce(
    (total, line) =>
      total + line.orderedQuantity,
    0,
  );

  const totalValue = selectedLines.reduce(
    (total, line) =>
      total +
      line.orderedQuantity * line.purchasePrice,
    0,
  );

  function setQuantity(
    variantId: string,
    value: string,
  ) {
    setQuantities((current) => ({
      ...current,
      [variantId]: Math.max(
        0,
        Number.parseInt(value || "0", 10) || 0,
      ),
    }));
  }

  function handleSave() {
    setError("");

    const supplier = suppliers.find(
      (item) => item.id === supplierId,
    );

    if (!supplier) {
      setError("Selecteer een leverancier.");
      return;
    }

    if (!collectionCode) {
      setError("Selecteer een collectie.");
      return;
    }

    if (selectedLines.length === 0) {
      setError(
        "Vul bij minimaal één variant een bestelaantal in.",
      );
      return;
    }

    const order = createPurchaseOrder({
      supplierId,
      supplierName: supplier.companyName,
      collectionCode,
      expectedDeliveryDate,
      status,
      notes,
      lines: selectedLines.map((line) => ({
        ...line,
        id: "",
        receivedQuantity: 0,
      })),
    });

    router.push(`/inkoop/${order.id}`);
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/inkoop">Inkooporders</Link>
        <span>›</span>
        <span>Nieuwe inkooporder</span>
      </div>

      <PageHeader
        eyebrow="Inkoop"
        title="Nieuwe inkooporder"
        description="Selecteer een leverancier en vul bestelaantallen per maat en kleur in."
      />

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Ordergegevens
                </h2>
              </div>
            </div>

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
                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.companyName}
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
                  {collections.map((collection) => (
                    <option key={collection}>
                      {collection}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Verwachte leverdatum</span>
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
                        .value as PurchaseOrderStatus,
                    )
                  }
                >
                  <option>Concept</option>
                  <option>Besteld</option>
                </select>
              </label>

              <label className={styles.fullWidth}>
                <span>Interne notitie</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                />
              </label>
            </div>
          </article>

          <article className="content-card">
            <div className="content-card-toolbar">
              <div className="table-search">
                <span>⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Zoek op artikel, code of SKU..."
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
                      Bestelaantal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLines.map((line) => (
                    <tr key={line.variantId}>
                      <td className="table-primary">
                        {line.productName}
                      </td>
                      <td>{line.sku}</td>
                      <td>{line.color}</td>
                      <td>{line.size}</td>
                      <td className="table-number">
                        €{" "}
                        {line.purchasePrice.toLocaleString(
                          "nl-NL",
                          {
                            minimumFractionDigits: 2,
                          },
                        )}
                      </td>
                      <td className="table-number">
                        <input
                          className={styles.quantityInput}
                          type="number"
                          min="0"
                          value={
                            quantities[
                              line.variantId
                            ] ?? 0
                          }
                          onChange={(event) =>
                            setQuantity(
                              line.variantId,
                              event.target.value,
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className={styles.sideColumn}>
          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Ordersamenvatting
                </h2>
              </div>
            </div>

            <dl className={styles.summaryList}>
              <div>
                <dt>Orderregels</dt>
                <dd>{selectedLines.length}</dd>
              </div>
              <div>
                <dt>Totaal aantal</dt>
                <dd>{totalQuantity}</dd>
              </div>
              <div>
                <dt>Inkoopwaarde</dt>
                <dd>
                  €{" "}
                  {totalValue.toLocaleString(
                    "nl-NL",
                    {
                      minimumFractionDigits: 2,
                    },
                  )}
                </dd>
              </div>
            </dl>
          </article>
        </aside>
      </section>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.actions}>
        <Link
          href="/inkoop"
          className="button button-secondary"
        >
          Annuleren
        </Link>

        <button
          className="button button-primary"
          type="button"
          onClick={handleSave}
        >
          Inkooporder opslaan
        </button>
      </div>
    </div>
  );
}
