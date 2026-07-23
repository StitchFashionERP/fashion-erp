"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArticlesBulkBar } from "@/components/articles/articles-bulk-bar";
import {
  ArticlesGridToolbar,
  type ArticleColumnKey,
  type ArticleSortKey,
  type SortDirection,
} from "@/components/articles/articles-grid-toolbar";
import {
  ArticlesBulkDrawer,
  type ArticlesBulkChanges,
} from "@/components/articles/articles-bulk-drawer";
import { ArticlePropertiesDrawer } from "@/components/articles/article-properties-drawer";
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
import { getArticleHistoryCheck } from "@/lib/article-history";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

function getStatusTone(status: ProductStatus): StatusTone {
  if (status === "Actief") return "success";
  if (status === "Concept") return "info";
  return "neutral";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function toProductInput(product: Product): ProductInput {
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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("Alle collecties");
  const [status, setStatus] = useState("Actief");
  const [sortKey, setSortKey] = useState<ArticleSortKey>("name");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("ascending");
  const [visibleColumns, setVisibleColumns] = useState<ArticleColumnKey[]>([
    "code",
    "name",
    "collection",
    "garmentType",
    "material",
    "fit",
    "stock",
    "wholesalePrice",
    "status",
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
      ...Array.from(
        new Set(products.map((product) => product.collection).filter(Boolean)),
      ).sort(),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const searchText = [
        product.code,
        product.name,
        product.collection,
        product.brand,
        product.garmentType,
        product.category,
        product.material,
        product.fit,
        product.supplier,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchText.includes(query);
      const matchesCollection =
        collection === "Alle collecties" || product.collection === collection;
      const matchesStatus =
        status === "Alle statussen" || product.status === status;

      return matchesSearch && matchesCollection && matchesStatus;
    });

    return [...filtered].sort((left, right) => {
      const multiplier = sortDirection === "ascending" ? 1 : -1;

      const leftValue =
        sortKey === "stock"
          ? getProductStock(left)
          : sortKey === "wholesalePrice"
            ? left.wholesalePrice
            : String(left[sortKey] ?? "").toLowerCase();

      const rightValue =
        sortKey === "stock"
          ? getProductStock(right)
          : sortKey === "wholesalePrice"
            ? right.wholesalePrice
            : String(right[sortKey] ?? "").toLowerCase();

      if (leftValue < rightValue) return -1 * multiplier;
      if (leftValue > rightValue) return 1 * multiplier;
      return 0;
    });
  }, [
    products,
    search,
    collection,
    status,
    sortKey,
    sortDirection,
  ]);

  const visibleIds = useMemo(
    () => filteredProducts.map((product) => product.id),
    [filteredProducts],
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.includes(product.id)),
    [products, selectedIds],
  );

  const activeProduct = useMemo(
    () =>
      activeProductId
        ? products.find((product) => product.id === activeProductId) ?? null
        : null,
    [products, activeProductId],
  );

  const visibleSelectedCount = visibleIds.filter((id) =>
    selectedIds.includes(id),
  ).length;

  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const partlyVisibleSelected =
    visibleSelectedCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partlyVisibleSelected;
    }
  }, [partlyVisibleSelected]);

  useEffect(() => {
    const validIds = new Set(products.map((product) => product.id));
    setSelectedIds((current) => current.filter((id) => validIds.has(id)));
  }, [products]);

  const totalStock = products.reduce(
    (total, product) => total + getProductStock(product),
    0,
  );

  function toggleSelection(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function resetFilters() {
    setSearch("");
    setCollection("Alle collecties");
    setStatus("Actief");
  }

  function saveBulkChanges(changes: ArticlesBulkChanges) {
    try {
      const count = selectedProducts.length;

      selectedProducts.forEach((product) => {
        updateProduct(product.id, {
          ...toProductInput(product),
          ...changes,
        });
      });

      reload();
      setSelectedIds([]);
      setBulkDrawerOpen(false);
      setError("");
      setMessage(
        `${count} ${count === 1 ? "artikel is" : "artikelen zijn"} aangepast.`,
      );
    } catch (caughtError) {
      setMessage("");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De bulkwijziging kon niet worden opgeslagen.",
      );
    }
  }

  function saveProperties(productId: string, input: ProductInput) {
    try {
      updateProduct(productId, input);
      reload();
      setError("");
      setMessage("Artikel bijgewerkt.");
    } catch (caughtError) {
      setMessage("");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Het artikel kon niet worden opgeslagen.",
      );
    }
  }

  function archiveSelected() {
    if (!selectedProducts.length) return;

    const confirmed = window.confirm(
      `${selectedProducts.length} ${
        selectedProducts.length === 1 ? "artikel" : "artikelen"
      } archiveren?`,
    );
    if (!confirmed) return;

    selectedProducts.forEach((product) =>
      setProductStatus(product.id, "Inactief"),
    );

    const count = selectedProducts.length;
    reload();
    setSelectedIds([]);
    setError("");
    setMessage(
      `${count} ${count === 1 ? "artikel is" : "artikelen zijn"} gearchiveerd.`,
    );
  }

  function exportSelected() {
    if (!selectedProducts.length) return;

    const rows: Array<Array<string | number>> = [
      [
        "Artikelcode",
        "Artikel",
        "Collectie",
        "Merk",
        "Type",
        "Categorie",
        "Leverancier",
        "Voorraad",
        "Wholesaleprijs",
        "Adviesverkoopprijs",
        "Status",
      ],
      ...selectedProducts.map((product) => [
        product.code,
        product.name,
        product.collection,
        product.brand,
        product.garmentType,
        product.category,
        product.supplier,
        getProductStock(product),
        product.wholesalePrice,
        product.recommendedRetailPrice,
        product.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stitch-artikelen-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function archiveProduct(product: Product) {
    setProductStatus(
      product.id,
      product.status === "Inactief" ? "Actief" : "Inactief",
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
    const history = getArticleHistoryCheck(product.id);

    if (!history.canDelete) {
      setMessage("");
      setError(history.message);
      return;
    }

    const confirmed = window.confirm(
      `Artikel ${product.code} · ${product.name} definitief verwijderen?`,
    );
    if (!confirmed) return;

    deleteProduct(product.id);
    reload();
    setSelectedIds((current) => current.filter((id) => id !== product.id));
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
          <Link href="/artikelen/nieuw" className="button button-primary">
            + Nieuw artikel
          </Link>
        }
      />

      {message && <div className="master-data-success">✓ {message}</div>}
      {error && <div className="master-data-error">! {error}</div>}

      <section className="article-summary-grid">
        <article className="metric-card">
          <div className="metric-label">Totaal artikelen</div>
          <div className="metric-value">{isLoaded ? products.length : "—"}</div>
          <div className="metric-detail">inclusief gearchiveerd</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Actieve artikelen</div>
          <div className="metric-value">
            {isLoaded
              ? products.filter((product) => product.status === "Actief").length
              : "—"}
          </div>
          <div className="metric-detail">beschikbaar voor verkoop</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Totale voorraad</div>
          <div className="metric-value">{isLoaded ? totalStock : "—"}</div>
          <div className="metric-detail">stuks over alle varianten</div>
        </article>
      </section>

      <section className="content-card" style={{ overflow: "hidden" }}>
        <div className="content-card-toolbar article-toolbar">
          <div className="table-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Zoek op artikel, DNA-kenmerk of leverancier..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="article-filters">
            <select
              className="article-filter-select"
              value={collection}
              onChange={(event) => setCollection(event.target.value)}
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
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="Actief">Actief</option>
              <option value="Concept">Concept</option>
              <option value="Inactief">Gearchiveerd</option>
              <option value="Alle statussen">Alles</option>
            </select>
          </div>
        </div>

        <div className="article-results-bar">
          <span>
            <strong>{filteredProducts.length}</strong>{" "}
            {filteredProducts.length === 1 ? "artikel" : "artikelen"}
          </span>

          {(search ||
            collection !== "Alle collecties" ||
            status !== "Actief") && (
            <button className="text-button" type="button" onClick={resetFilters}>
              Filters wissen
            </button>
          )}
        </div>

        <ArticlesGridToolbar
          sortKey={sortKey}
          sortDirection={sortDirection}
          visibleColumns={visibleColumns}
          onSortKeyChange={setSortKey}
          onSortDirectionChange={setSortDirection}
          onVisibleColumnsChange={setVisibleColumns}
        />

        <ArticlesBulkBar
          selectedCount={selectedIds.length}
          onEdit={() => setBulkDrawerOpen(true)}
          onExport={exportSelected}
          onArchive={archiveSelected}
          onClear={() => setSelectedIds([])}
        />

        <div className="table-wrapper">
          <table className="data-table article-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: "center" }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Alle zichtbare artikelen selecteren"
                  />
                </th>
                {visibleColumns.includes("code") && <th>Artikelcode</th>}
                {visibleColumns.includes("name") && <th>Artikel</th>}
                {visibleColumns.includes("collection") && <th>Collectie</th>}
                {visibleColumns.includes("garmentType") && <th>Type</th>}
                {visibleColumns.includes("material") && <th>Materiaal</th>}
                {visibleColumns.includes("fit") && <th>Pasvorm</th>}
                {visibleColumns.includes("stock") && (
                  <th className="table-number">Voorraad</th>
                )}
                {visibleColumns.includes("wholesalePrice") && (
                  <th className="table-number">Wholesaleprijs</th>
                )}
                {visibleColumns.includes("status") && <th>Status</th>}
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const selected = selectedIds.includes(product.id);

                return (
                  <tr
                    key={product.id}
                    style={{ background: selected ? "#f2f7fc" : undefined }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(product.id)}
                        aria-label={`${product.code} selecteren`}
                      />
                    </td>

                    {visibleColumns.includes("code") && (
                      <td>
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => setActiveProductId(product.id)}
                          style={{
                            border: 0,
                            padding: 0,
                            background: "transparent",
                            cursor: "pointer",
                            font: "inherit",
                          }}
                        >
                          {product.code}
                        </button>
                      </td>
                    )}

                    {visibleColumns.includes("name") && (
                      <td className="table-primary">
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => setActiveProductId(product.id)}
                          style={{
                            border: 0,
                            padding: 0,
                            background: "transparent",
                            cursor: "pointer",
                            font: "inherit",
                            fontWeight: 700,
                          }}
                        >
                          {product.name}
                        </button>
                      </td>
                    )}

                    {visibleColumns.includes("collection") && (
                      <td>{product.collection || "—"}</td>
                    )}
                    {visibleColumns.includes("garmentType") && (
                      <td>{product.garmentType || product.category || "—"}</td>
                    )}
                    {visibleColumns.includes("material") && (
                      <td>{product.material || "—"}</td>
                    )}
                    {visibleColumns.includes("fit") && (
                      <td>{product.fit || "—"}</td>
                    )}

                    {visibleColumns.includes("stock") && (
                      <td
                        className={`table-number table-primary ${
                          getProductStock(product) <= 10 ? "stock-warning" : ""
                        }`}
                      >
                        {getProductStock(product)}
                      </td>
                    )}

                    {visibleColumns.includes("wholesalePrice") && (
                      <td className="table-number table-primary">
                        {formatCurrency(product.wholesalePrice)}
                      </td>
                    )}

                    {visibleColumns.includes("status") && (
                      <td>
                        <StatusBadge
                          label={
                            product.status === "Inactief"
                              ? "Gearchiveerd"
                              : product.status
                          }
                          tone={getStatusTone(product.status)}
                        />
                      </td>
                    )}

                    <td className="table-number">
                      <div className="master-data-row-actions">
                        <Link href={`/artikelen/${product.id}/bewerken`}>
                          Bewerken
                        </Link>
                        <button
                          type="button"
                          onClick={() => archiveProduct(product)}
                        >
                          {product.status === "Inactief"
                            ? "Activeren"
                            : "Archiveren"}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removeProduct(product)}
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

        {isLoaded && filteredProducts.length === 0 && (
          <div className="article-empty-state">
            <h2>Geen artikelen gevonden</h2>
            <p>Pas je zoekterm of filters aan.</p>
          </div>
        )}
      </section>

      <ArticlesBulkDrawer
        open={bulkDrawerOpen}
        selectedCount={selectedProducts.length}
        collections={collections.filter((item) => item !== "Alle collecties")}
        onClose={() => setBulkDrawerOpen(false)}
        onSave={saveBulkChanges}
      />

      <ArticlePropertiesDrawer
        product={activeProduct}
        onClose={() => setActiveProductId(null)}
        onSave={saveProperties}
      />
    </div>
  );
}
