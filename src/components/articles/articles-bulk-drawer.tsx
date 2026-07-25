"use client";

import { useState, type ChangeEvent } from "react";
import type { ProductStatus } from "@/lib/articles";

export type ArticlesBulkChanges = {
  collection?: string;
  brand?: string;
  supplier?: string;
  garmentType?: string;
  category?: string;
  status?: ProductStatus;
  material?: string;
  fit?: string;
  wholesalePrice?: number;
  recommendedRetailPrice?: number;
};

type FieldKey = keyof ArticlesBulkChanges;

type ArticlesBulkDrawerProps = {
  open: boolean;
  selectedCount: number;
  collections: string[];
  onClose: () => void;
  onSave: (changes: ArticlesBulkChanges) => void;
};

const fields: Array<{ key: FieldKey; label: string }> = [
  { key: "collection", label: "Collectie" },
  { key: "brand", label: "Merk" },
  { key: "supplier", label: "Leverancier" },
  { key: "garmentType", label: "Producttype" },
  { key: "category", label: "Categorie" },
  { key: "status", label: "Status" },
  { key: "material", label: "Materiaal" },
  { key: "fit", label: "Pasvorm" },
  { key: "wholesalePrice", label: "Wholesaleprijs" },
  {
    key: "recommendedRetailPrice",
    label: "Adviesverkoopprijs",
  },
];

export function ArticlesBulkDrawer({
  open,
  selectedCount,
  collections,
  onClose,
  onSave,
}: ArticlesBulkDrawerProps) {
  const [activeFields, setActiveFields] = useState<FieldKey[]>([]);
  const [values, setValues] = useState<
    Partial<Record<FieldKey, string>>
  >({});

  if (!open) {
    return null;
  }

  function close() {
    setActiveFields([]);
    setValues({});
    onClose();
  }

  function toggleField(key: FieldKey) {
    setActiveFields((current) =>
      current.includes(key)
        ? current.filter((field) => field !== key)
        : [...current, key],
    );
  }

  function updateValue(
    key: FieldKey,
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >,
  ) {
    setValues((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  }

  function save() {
    const changes: ArticlesBulkChanges = {};

    activeFields.forEach((key) => {
      const value = values[key] ?? "";

      if (
        key === "wholesalePrice" ||
        key === "recommendedRetailPrice"
      ) {
        const numericValue = Number(
          value.replace(",", "."),
        );

        if (Number.isFinite(numericValue)) {
          changes[key] = numericValue;
        }

        return;
      }

      if (key === "status") {
        changes.status = value as ProductStatus;
        return;
      }

      if (key === "collection") {
        changes.collection = value;
      }

      if (key === "brand") {
        changes.brand = value;
      }

      if (key === "supplier") {
        changes.supplier = value;
      }

      if (key === "garmentType") {
        changes.garmentType = value;
      }

      if (key === "category") {
        changes.category = value;
      }

      if (key === "material") {
        changes.material = value;
      }

      if (key === "fit") {
        changes.fit = value;
      }
    });

    onSave(changes);
    setActiveFields([]);
    setValues({});
  }

  return (
    <>
      <button
        type="button"
        aria-label="Bulkvenster sluiten"
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          border: 0,
          background: "rgba(9, 30, 58, 0.28)",
        }}
      />

      <aside
        aria-label="Bulk wijzigen"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 90,
          width: "min(540px, 96vw)",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          boxShadow:
            "-14px 0 40px rgba(9, 30, 58, 0.2)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "22px 24px",
            borderBottom: "1px solid #dbe3ee",
          }}
        >
          <div>
            <div
              style={{
                color: "#73829a",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              Artikelen
            </div>

            <h2
              style={{
                margin: "4px 0 0",
                fontSize: 22,
              }}
            >
              Bulk wijzigen
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#66758c",
              }}
            >
              {selectedCount}{" "}
              {selectedCount === 1
                ? "artikel geselecteerd"
                : "artikelen geselecteerd"}
            </p>
          </div>

          <button
            type="button"
            aria-label="Sluiten"
            onClick={close}
            style={{
              border: 0,
              background: "transparent",
              fontSize: 28,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
          }}
        >
          <div
            style={{
              marginBottom: 18,
              padding: 14,
              border: "1px solid #dbe3ee",
              borderRadius: 6,
              background: "#f7f9fc",
              color: "#4e5f78",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Vink alleen de velden aan die je bij alle
            geselecteerde artikelen wilt overschrijven.
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {fields.map(({ key, label }) => {
              const active =
                activeFields.includes(key);

              const inputStyle = {
                width: "100%",
                minHeight: 40,
                padding: "8px 10px",
                border: "1px solid #cbd6e4",
                borderRadius: 4,
                background: active
                  ? "#ffffff"
                  : "#f1f4f8",
              };

              return (
                <div
                  key={key}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "24px 148px 1fr",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    border: `1px solid ${
                      active
                        ? "#86b7e5"
                        : "#dbe3ee"
                    }`,
                    borderRadius: 6,
                    background: active
                      ? "#f4f9fe"
                      : "#ffffff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      toggleField(key)
                    }
                    aria-label={`${label} wijzigen`}
                  />

                  <strong style={{ fontSize: 13 }}>
                    {label}
                  </strong>

                  {key === "status" ? (
                    <select
                      disabled={!active}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        updateValue(key, event)
                      }
                      style={inputStyle}
                    >
                      <option value="">
                        Kies status
                      </option>
                      <option value="Actief">
                        Actief
                      </option>
                      <option value="Concept">
                        Concept
                      </option>
                      <option value="Inactief">
                        Gearchiveerd
                      </option>
                    </select>
                  ) : key === "collection" ? (
                    <select
                      disabled={!active}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        updateValue(key, event)
                      }
                      style={inputStyle}
                    >
                      <option value="">
                        Kies collectie
                      </option>

                      {collections.map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      disabled={!active}
                      type={
                        key === "wholesalePrice" ||
                        key ===
                          "recommendedRetailPrice"
                          ? "number"
                          : "text"
                      }
                      step={
                        key === "wholesalePrice" ||
                        key ===
                          "recommendedRetailPrice"
                          ? "0.01"
                          : undefined
                      }
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        updateValue(key, event)
                      }
                      placeholder={`Nieuwe ${label.toLowerCase()}`}
                      style={inputStyle}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "16px 24px",
            borderTop: "1px solid #dbe3ee",
            background: "#f7f9fc",
          }}
        >
          <button
            type="button"
            className="button"
            onClick={close}
          >
            Annuleren
          </button>

          <button
            type="button"
            className="button button-primary"
            disabled={activeFields.length === 0}
            onClick={save}
          >
            Wijzigingen opslaan
          </button>
        </footer>
      </aside>
    </>
  );
}