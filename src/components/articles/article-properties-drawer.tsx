"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { MasterSelect } from "@/components/master-data/master-select";
import {
  getVariantKey,
  type Product,
  type ProductInput,
  type ProductStatus,
} from "@/lib/articles";

type ArticlePropertiesDrawerProps = {
  product: Product | null;
  onClose: () => void;
  onSave: (productId: string, input: ProductInput) => void;
};

type FormState = {
  code: string;
  name: string;
  collection: string;
  brand: string;
  supplier: string;
  garmentType: string;
  category: string;
  material: string;
  fit: string;
  colorFamily: string;
  seasonType: ProductInput["seasonType"];
  countryOfOrigin: string;
  status: ProductStatus;
  purchasePrice: string;
  wholesalePrice: string;
  recommendedRetailPrice: string;
  description: string;
};

function createFormState(product: Product): FormState {
  return {
    code: product.code,
    name: product.name,
    collection: product.collection,
    brand: product.brand,
    supplier: product.supplier,
    garmentType: product.garmentType,
    category: product.category,
    material: product.material,
    fit: product.fit,
    colorFamily: product.colorFamily,
    seasonType: product.seasonType,
    countryOfOrigin: product.countryOfOrigin,
    status: product.status,
    purchasePrice: String(product.purchasePrice ?? 0),
    wholesalePrice: String(product.wholesalePrice ?? 0),
    recommendedRetailPrice: String(product.recommendedRetailPrice ?? 0),
    description: product.description,
  };
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ArticlePropertiesDrawer({
  product,
  onClose,
  onSave,
}: ArticlePropertiesDrawerProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (product) {
      setForm(createFormState(product));
      setDirty(false);
    } else {
      setForm(null);
      setDirty(false);
    }
  }, [product]);

  if (!product || !form) return null;

  function updateField(
    key: keyof FormState,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: event.target.value,
          }
        : current,
    );
    setDirty(true);
  }

  function close() {
    if (
      dirty &&
      !window.confirm("Niet-opgeslagen wijzigingen verwerpen?")
    ) {
      return;
    }
    onClose();
  }

  function save() {
    const input: ProductInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      collection: form.collection.trim(),
      category: form.category.trim(),
      supplier: form.supplier.trim(),
      status: form.status,
      vatCode: product.vatCode,
      brand: form.brand.trim(),
      material: form.material.trim(),
      garmentType: form.garmentType.trim(),
      fit: form.fit.trim(),
      colorFamily: form.colorFamily.trim(),
      seasonType: form.seasonType,
      countryOfOrigin: form.countryOfOrigin.trim(),
      description: form.description.trim(),
      purchasePrice: parseNumber(form.purchasePrice),
      wholesalePrice: parseNumber(form.wholesalePrice),
      shippingCosts: product.shippingCosts,
      otherCosts: product.otherCosts,
      totalCost: product.totalCost,
      brandMarkup: product.brandMarkup,
      recommendedRetailPrice: parseNumber(form.recommendedRetailPrice),
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

    onSave(product.id, input);
    setDirty(false);
  }

  const inputStyle = {
    width: "100%",
    minHeight: 40,
    border: "1px solid #cbd6e4",
    borderRadius: 4,
    padding: "8px 10px",
    background: "#fff",
  };

  return (
    <>
      <button
        type="button"
        aria-label="Artikelpaneel sluiten"
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          border: 0,
          background: "rgba(9, 30, 58, 0.26)",
        }}
      />

      <aside
        aria-label="Artikeleigenschappen"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 90,
          width: "min(620px, 97vw)",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          boxShadow: "-16px 0 44px rgba(9, 30, 58, 0.22)",
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
              Artikelkaart
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 23 }}>
              {form.name || "Naamloos artikel"}
            </h2>
            <p style={{ margin: "6px 0 0", color: "#66758c" }}>
              {form.code || "Geen artikelcode"}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Sluiten"
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
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>
              Basisgegevens
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <label>
                <span style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  Artikelcode
                </span>
                <input
                  value={form.code}
                  onChange={(event) => updateField("code", event)}
                  style={inputStyle}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  Status
                </span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event)}
                  style={inputStyle}
                >
                  <option value="Actief">Actief</option>
                  <option value="Concept">Concept</option>
                  <option value="Inactief">Gearchiveerd</option>
                </select>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  Artikelnaam
                </span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event)}
                  style={inputStyle}
                />
              </label>

              <MasterSelect
                entity="collections"
                label="Collectie"
                value={form.collection}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, collection: value } : current);
                  setDirty(true);
                }}
              />

              <MasterSelect
                entity="brands"
                label="Merk"
                value={form.brand}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, brand: value } : current);
                  setDirty(true);
                }}
              />

              <MasterSelect
                entity="suppliers"
                label="Leverancier"
                value={form.supplier}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, supplier: value } : current);
                  setDirty(true);
                }}
              />

              <MasterSelect
                entity="productTypes"
                label="Producttype"
                value={form.garmentType}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, garmentType: value } : current);
                  setDirty(true);
                }}
              />

              <MasterSelect
                entity="categories"
                label="Categorie"
                value={form.category}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, category: value } : current);
                  setDirty(true);
                }}
              />
            </div>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>
              Product DNA
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <MasterSelect
                entity="materials"
                label="Materiaal"
                value={form.material}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, material: value } : current);
                  setDirty(true);
                }}
              />

              <MasterSelect
                entity="fits"
                label="Pasvorm"
                value={form.fit}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, fit: value } : current);
                  setDirty(true);
                }}
              />

              <MasterSelect
                entity="colorFamilies"
                label="Kleurgroep"
                value={form.colorFamily}
                onChange={(value) => {
                  setForm((current) => current ? { ...current, colorFamily: value } : current);
                  setDirty(true);
                }}
              />

              <MasterSelect
                entity="seasons"
                label="Seizoenstype"
                value={form.seasonType}
                onChange={(value) => {
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          seasonType: value as FormState["seasonType"],
                        }
                      : current,
                  );
                  setDirty(true);
                }}
              />

              <div style={{ gridColumn: "1 / -1" }}>
                <MasterSelect
                  entity="countries"
                  label="Land van herkomst"
                  value={form.countryOfOrigin}
                  onChange={(value) => {
                    setForm((current) =>
                      current ? { ...current, countryOfOrigin: value } : current,
                    );
                    setDirty(true);
                  }}
                />
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>
              Prijzen
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
              }}
            >
              <label>
                <span style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  Inkoopprijs
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(event) => updateField("purchasePrice", event)}
                  style={inputStyle}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  Wholesale
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={form.wholesalePrice}
                  onChange={(event) => updateField("wholesalePrice", event)}
                  style={inputStyle}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  Adviesverkoop
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={form.recommendedRetailPrice}
                  onChange={(event) =>
                    updateField("recommendedRetailPrice", event)
                  }
                  style={inputStyle}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>
              Omschrijving
            </h3>

            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event)}
              rows={6}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 130,
              }}
            />
          </section>
        </div>

        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 24px",
            borderTop: "1px solid #dbe3ee",
            background: "#f7f9fc",
          }}
        >
          <span style={{ color: dirty ? "#9a6700" : "#66758c", fontSize: 13 }}>
            {dirty ? "Niet-opgeslagen wijzigingen" : "Alles opgeslagen"}
          </span>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="button" onClick={close}>
              Sluiten
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={!dirty}
              onClick={save}
            >
              Opslaan
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
