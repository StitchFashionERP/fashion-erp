"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BulkActionToolbar } from "@/components/articles/bulk-action-toolbar";
import {
  BulkEditPanel,
  type BulkEditValues,
} from "@/components/articles/bulk-edit-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deleteProduct,
  getProductStock,
  getStoredProducts,
  getVariantKey,
  setProductStatus,
  updateProduct,
  type Product,
  type ProductInput,
  type ProductStatus,
} from "@/lib/articles";
import {
  getArticleHistoryCheck,
} from "@/lib/article-history";

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

function getStatusTone(
  status: ProductStatus,
): StatusTone {
  if (status === "Actief") {
    return "success";
  }

  if (status === "Concept") {
    return "info";
  }

  return "neutral";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function productToInput(product: Product): ProductInput {
  return {
    code: product.code,
    name: product.name,
    collection: product.collection,
    category: product.category,
    supplier: product.supplier,
    status: product.status,
    vatCode: product.vatCode,
    brand: product.brand,
    material: product.material,
    garmentType: product.garmentType,
    fit: product.fit,
    colorFamily: product.colorFamily,
    seasonType: product.seasonType,
    countryOfOrigin: product.countryOfOrigin,
    description: product.description,
    purchasePrice: product.purchasePrice,
    wholesalePrice: product.wholesalePrice,
    shippingCosts: product.shippingCosts,
    otherCosts: product.otherCosts,
    totalCost: product.totalCost,
    brandMarkup: product.brandMarkup,
    recommendedRetailPrice: product.recommendedRetailPrice,
    retailerMarkup: product.retailerMarkup,
    colors: [...product.colors],
    sizes: [...product.sizes],
    stockByVariant: Object.fromEntries(
      product.variants.map((variant) => [
        getVariantKey(variant.color, variant.size),
        variant.physicalStock,
      ]),
    ),
  };
}

export default function ArtikelenPage() {
  const [products, setProducts] = useState<
    Product[]
  >([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState(
    "Alle collecties",
  );
  const [status, setStatus] = useState("Actief");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  function reload() {
    setProducts(getStoredProducts());
  }

  useEffect(() => {
    reload();
    setIsLoaded(true);
  }, []);

  const collections = useMemo(
    () => [
      "Alle collecties",
      ...new Set(
        products.map(
          (product) => product.collection,
        ),
      ),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          product.name,
          product.code,
          product.supplier,
          product.category,
          product.garmentType,
          product.material,
          product.fit,
          product.colorFamily,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCollection =
        collection === "Alle collecties" ||
        product.collection === collection;

      const matchesStatus =
        status === "Alle statussen" ||
        product.status === status;

      return (
        matchesSearch &&
        matchesCollection &&
        matchesStatus
      );
    });
  }, [products, search, collection, status]);

  const visibleProductIds = useMemo(
    () => filteredProducts.map((product) => product.id),
    [filteredProducts],
  );

  const selectedProducts = useMemo(
    () =>
      products.filter((product) =>
        selectedIds.includes(product.id),
      ),
    [products, selectedIds],
  );

  const visibleSelectedCount = visibleProductIds.filter((id) =>
    selectedIds.includes(id),
  ).length;

  const allVisibleSelected =
    visibleProductIds.length > 0 &&
    visibleSelectedCount === visibleProductIds.length;

  const someVisibleSelected =
    visibleSelectedCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  function toggleProductSelection(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function toggleAllVisibleProducts() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (id) => !visibleProductIds.includes(id),
        );
      }

      return Array.from(
        new Set([...current, ...visibleProductIds]),
      );
    });
  }

  function saveBulkChanges(values: BulkEditValues) {
    try {
      selectedProducts.forEach((product) => {
        updateProduct(product.id, {
          ...productToInput(product),
          ...values,
        });
      });

      reload();
      setBulkPanelOpen(false);
      setSelectedIds([]);
      setError("");
      setMessage(
        `${selectedProducts.length} ${
          selectedProducts.length === 1
            ? "artikel is"
            : "artikelen zijn"
        } aangepast.`,
      );
    } catch (caughtError) {
      setMessage("");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Bulkwijziging kon niet worden opgeslagen.",
      );
    }
  }

  function archiveSelectedProducts() {
    selectedProducts.forEach((product) =>
      setProductStatus(product.id, "Inactief"),
    );
    reload();
    setSelectedIds([]);
    setMessage("Geselecteerde artikelen gearchiveerd.");
  }

  function exportSelectedProducts() {
    const rows = selectedProducts.map((product) => [
      product.code,
      product.name,
      product.collection,
      product.brand,
      product.wholesalePrice,
      product.status,
    ]);

    const csv = [
      ["Artikelcode", "Artikel", "Collectie", "Merk", "Wholesaleprijs", "Status"],
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "stitch-artikelen.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const totalStock = products.reduce(
    (total, product) =>
      total + getProductStock(product),
    0,
  );

  function resetFilters() {
    setSearch("");
    setCollection("Alle collecties");
    setStatus("Actief");
  }

  function archiveProduct(product: Product) {
    setProductStatus(
      product.id,
      product.status === "Inactief"
        ? "Actief"
        : "Inactief",
    );

    reload();
    setError("");
    setMessage(
      product.status === "Inactief"
        ? "Artikel opnieuw geactiveerd."
        : "Artikel gearchiveerd.",
    );
  }

  function removeProduct(product: Product) {
    const history =
      getArticleHistoryCheck(product.id);

    if (!history.canDelete) {
      setMessage("");
      setError(history.message);
      return;
    }

    const confirmed = window.confirm(
      `Artikel ${product.code} · ${product.name} definitief verwijderen?`,
    );

    if (!confirmed) {
      return;
    }

    deleteProduct(product.id);
    reload();
    setError("");
    setMessage("Artikel verwijderd.");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Assortiment"
        title="Artikelen"
        description="Beheer artikelen, Product DNA, prijzen, varianten en voorraad."
        action={
          <Link
            href="/artikelen/nieuw"
            className="button button-primary"
          >
            + Nieuw artikel
          </Link>
        }
      />

      {message && (
        <div className="master-data-success">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="master-data-error">
          ! {error}
        </div>
      )}

      <section className="article-summary-grid">
        <article className="metric-card">
          <div className="metric-label">
            Totaal artikelen
          </div>
          <div className="metric-value">
            {isLoaded ? products.length : "—"}
          </div>
          <div className="metric-detail">
            inclusief gearchiveerd
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Actieve artikelen
          </div>
          <div className="metric-value">
            {isLoaded
              ? products.filter(
                  (product) =>
                    product.status === "Actief",
                ).length
              : "—"}
          </div>
          <div className="metric-detail">
            beschikbaar voor verkoop
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Totale voorraad
          </div>
          <div className="metric-value">
            {isLoaded ? totalStock : "—"}
          </div>
          <div className="metric-detail">
            stuks over alle varianten
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-toolbar article-toolbar">
          <div className="table-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Zoek op artikel, DNA-kenmerk of leverancier..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="article-filters">
            <select
              className="article-filter-select"
              value={collection}
              onChange={(event) =>
                setCollection(event.target.value)
              }
            >
              {collections.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              className="article-filter-select"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              <option value="Actief">
                Actief
              </option>
              <option value="Concept">
                Concept
              </option>
              <option value="Inactief">
                Gearchiveerd
              </option>
              <option value="Alle statussen">
                Alles
              </option>
            </select>
          </div>
        </div>

        <div className="article-results-bar">
          <span>
            <strong>
              {filteredProducts.length}
            </strong>{" "}
            {filteredProducts.length === 1
              ? "artikel"
              : "artikelen"}
          </span>

          {(search ||
            collection !== "Alle collecties" ||
            status !== "Actief") && (
            <button
              className="text-button"
              type="button"
              onClick={resetFilters}
            >
              Filters wissen
            </button>
          )}
        </div>

        <BulkActionToolbar
          selectedCount={selectedIds.length}
          onEdit={() => setBulkPanelOpen(true)}
          onExport={exportSelectedProducts}
          onArchive={archiveSelectedProducts}
          onClear={() => setSelectedIds([])}
        />

        <div className="table-wrapper">
          <table className="data-table article-table">
            <thead>
              <tr>
                <th style={{ width: 42, textAlign: "center" }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleProducts}
                    aria-label="Alle zichtbare artikelen selecteren"
                  />
                </th>
                <th>Artikelcode</th>
                <th>Artikel</th>
                <th>Collectie</th>
                <th>Type</th>
                <th>Materiaal</th>
                <th>Pasvorm</th>
                <th className="table-number">
                  Voorraad
                </th>
                <th className="table-number">
                  Wholesaleprijs
                </th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);

                return (
                  <tr
                    key={product.id}
                    style={{
                      background: isSelected ? "#f2f7fc" : undefined,
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleProductSelection(product.id)
                        }
                        aria-label={`${product.code} selecteren`}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/artikelen/${product.id}`}
                        className="table-link"
                      >
                        {product.code}
                      </Link>
                    </td>

                    <td className="table-primary">
                      <Link
                        href={`/artikelen/${product.id}`}
                        className="table-link"
                      >
                        {product.name}
                      </Link>
                    </td>

                    <td>
                      {product.collection}
                    </td>
                    <td>
                      {product.garmentType ||
                        product.category ||
                        "—"}
                    </td>
                    <td>
                      {product.material || "—"}
                    </td>
                    <td>{product.fit || "—"}</td>

                    <td
                      className={`table-number table-primary ${
                        getProductStock(product) <= 10
                          ? "stock-warning"
                          : ""
                      }`}
                    >
                      {getProductStock(product)}
                    </td>

                    <td className="table-number table-primary">
                      {formatCurrency(
                        product.wholesalePrice,
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        label={
                          product.status === "Inactief"
                            ? "Gearchiveerd"
                            : product.status
                        }
                        tone={getStatusTone(
                          product.status,
                        )}
                      />
                    </td>

                    <td className="table-number">
                      <div className="master-data-row-actions">
                        <Link
                          href={`/artikelen/${product.id}/bewerken`}
                        >
                          Bewerken
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            archiveProduct(product)
                          }
                        >
                          {product.status ===
                          "Inactief"
                            ? "Activeren"
                            : "Archiveren"}
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            removeProduct(product)
                          }
                        >
                          Verwijderen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoaded &&
          filteredProducts.length === 0 && (
            <div className="article-empty-state">
              <h2>
                Geen artikelen gevonden
              </h2>
              <p>
                Pas je zoekterm of filters aan.
              </p>
            </div>
          )}
      </section>

      <BulkEditPanel
        open={bulkPanelOpen}
        selectedProducts={selectedProducts}
        collections={collections.filter(
          (item) => item !== "Alle collecties",
        )}
        onClose={() => setBulkPanelOpen(false)}
        onSave={saveBulkChanges}
      />
    </div>
  );
}
