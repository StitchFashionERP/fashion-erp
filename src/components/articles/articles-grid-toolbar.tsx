"use client";

import { useEffect, useRef, useState } from "react";

export type ArticleColumnKey =
  | "code"
  | "name"
  | "collection"
  | "garmentType"
  | "material"
  | "fit"
  | "stock"
  | "wholesalePrice"
  | "status";

export type ArticleSortKey =
  | "code"
  | "name"
  | "collection"
  | "garmentType"
  | "material"
  | "fit"
  | "stock"
  | "wholesalePrice"
  | "status";

export type SortDirection = "ascending" | "descending";

type Props = {
  sortKey: ArticleSortKey;
  sortDirection: SortDirection;
  visibleColumns: ArticleColumnKey[];
  onSortKeyChange: (value: ArticleSortKey) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  onVisibleColumnsChange: (value: ArticleColumnKey[]) => void;
};

const columns: Array<{ key: ArticleColumnKey; label: string }> = [
  { key: "code", label: "Artikelcode" },
  { key: "name", label: "Artikel" },
  { key: "collection", label: "Collectie" },
  { key: "garmentType", label: "Type" },
  { key: "material", label: "Materiaal" },
  { key: "fit", label: "Pasvorm" },
  { key: "stock", label: "Voorraad" },
  { key: "wholesalePrice", label: "Wholesaleprijs" },
  { key: "status", label: "Status" },
];

export function ArticlesGridToolbar({
  sortKey,
  sortDirection,
  visibleColumns,
  onSortKeyChange,
  onSortDirectionChange,
  onVisibleColumnsChange,
}: Props) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      "stitch-articles-visible-columns-v1",
    );

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ArticleColumnKey[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          onVisibleColumnsChange(parsed);
        }
      } catch {
        window.localStorage.removeItem(
          "stitch-articles-visible-columns-v1",
        );
      }
    }
  }, [onVisibleColumnsChange]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setColumnsOpen(false);
      }
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function toggleColumn(key: ArticleColumnKey) {
    const next = visibleColumns.includes(key)
      ? visibleColumns.filter((item) => item !== key)
      : [...visibleColumns, key];

    if (next.length === 0) return;

    onVisibleColumnsChange(next);
    window.localStorage.setItem(
      "stitch-articles-visible-columns-v1",
      JSON.stringify(next),
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 18px",
        borderTop: "1px solid #edf1f6",
        borderBottom: "1px solid #dbe3ee",
        background: "#fbfcfe",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#66758c", fontSize: 13 }}>Sorteren op</span>

        <select
          value={sortKey}
          onChange={(event) =>
            onSortKeyChange(event.target.value as ArticleSortKey)
          }
          style={{
            minHeight: 34,
            border: "1px solid #cbd6e4",
            borderRadius: 4,
            padding: "6px 10px",
            background: "#fff",
          }}
        >
          {columns.map((column) => (
            <option key={column.key} value={column.key}>
              {column.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="button"
          onClick={() =>
            onSortDirectionChange(
              sortDirection === "ascending"
                ? "descending"
                : "ascending",
            )
          }
          style={{ minWidth: 120 }}
        >
          {sortDirection === "ascending" ? "Oplopend ↑" : "Aflopend ↓"}
        </button>
      </div>

      <button
        type="button"
        className="button"
        onClick={() => setColumnsOpen((current) => !current)}
      >
        Kolommen
      </button>

      {columnsOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 18,
            zIndex: 40,
            width: 240,
            padding: 10,
            border: "1px solid #cbd6e4",
            borderRadius: 6,
            background: "#fff",
            boxShadow: "0 12px 28px rgba(9,30,58,.15)",
          }}
        >
          <div
            style={{
              padding: "6px 8px 10px",
              color: "#66758c",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Zichtbare kolommen
          </div>

          {columns.map((column) => (
            <label
              key={column.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(column.key)}
                onChange={() => toggleColumn(column.key)}
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
