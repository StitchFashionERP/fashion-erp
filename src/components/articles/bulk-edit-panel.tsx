"use client";

import { useEffect, useState } from "react";
import type { Product, ProductStatus } from "@/lib/articles";

export type BulkEditValues = {
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

type Props = {
  open: boolean;
  selectedProducts: Product[];
  collections: string[];
  onClose: () => void;
  onSave: (values: BulkEditValues) => void;
};

const fields = [
  ["collection", "Collectie"],
  ["brand", "Merk"],
  ["supplier", "Leverancier"],
  ["garmentType", "Producttype"],
  ["category", "Categorie"],
  ["status", "Status"],
  ["material", "Materiaal"],
  ["fit", "Pasvorm"],
  ["wholesalePrice", "Wholesaleprijs"],
  ["recommendedRetailPrice", "Adviesverkoopprijs"],
] as const;

export function BulkEditPanel({
  open,
  selectedProducts,
  collections,
  onClose,
  onSave,
}: Props) {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setEnabled([]);
      setValues({});
    }
  }, [open]);

  if (!open) return null;

  function submit() {
    const result: BulkEditValues = {};

    for (const key of enabled) {
      const value = values[key] ?? "";

      if (
        key === "wholesalePrice" ||
        key === "recommendedRetailPrice"
      ) {
        (result as Record<string, unknown>)[key] = Number(
          value.replace(",", "."),
        );
      } else {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    onSave(result);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          border: 0,
          background: "rgba(15,34,58,.22)",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 70,
          width: "min(520px,96vw)",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          boxShadow: "-12px 0 36px rgba(15,34,58,.18)",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: 20,
            borderBottom: "1px solid #dbe3ee",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Bulk wijzigen</h2>
            <small>{selectedProducts.length} artikelen</small>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <p>Vink alleen de velden aan die je wilt overschrijven.</p>

          <div style={{ display: "grid", gap: 12 }}>
            {fields.map(([key, label]) => {
              const active = enabled.includes(key);

              return (
                <div
                  key={key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 145px 1fr",
                    alignItems: "center",
                    gap: 10,
                    padding: 10,
                    border: "1px solid #dbe3ee",
                    borderRadius: 6,
                    background: active ? "#f2f7fc" : "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      setEnabled((current) =>
                        active
                          ? current.filter((item) => item !== key)
                          : [...current, key],
                      )
                    }
                  />
                  <strong>{label}</strong>

                  {key === "status" ? (
                    <select
                      disabled={!active}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Kies status</option>
                      <option value="Actief">Actief</option>
                      <option value="Concept">Concept</option>
                      <option value="Inactief">Gearchiveerd</option>
                    </select>
                  ) : key === "collection" ? (
                    <select
                      disabled={!active}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Kies collectie</option>
                      {collections.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      disabled={!active}
                      type={key.includes("Price") ? "number" : "text"}
                      step={key.includes("Price") ? "0.01" : undefined}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
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
            gap: 8,
            padding: 16,
            borderTop: "1px solid #dbe3ee",
          }}
        >
          <button type="button" className="button" onClick={onClose}>
            Annuleren
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!enabled.length}
            onClick={submit}
          >
            Opslaan
          </button>
        </footer>
      </aside>
    </>
  );
}
