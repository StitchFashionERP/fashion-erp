"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts } from "@/lib/articles";
import { getCustomers } from "@/lib/master-data";
import {
  createPriceAgreement,
  createPriceList,
  deletePriceAgreement,
  getPriceAgreements,
  getPriceLists,
  updatePriceList,
  type PriceAgreement,
  type PriceList,
} from "@/lib/price-lists";
import styles from "./price-lists.module.css";

export default function PriceListsPage() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [agreements, setAgreements] = useState<PriceAgreement[]>([]);
  const [listName, setListName] = useState("");
  const [listCode, setListCode] = useState("");
  const [adjustment, setAdjustment] = useState("0");

  const [priceListId, setPriceListId] = useState("price-list-standard");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [minQuantity, setMinQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const customers = useMemo(() => getCustomers(), []);
  const products = useMemo(() => getStoredProducts(), []);
  const product = products.find((item) => item.id === productId);

  function reload() {
    setLists(getPriceLists());
    setAgreements(getPriceAgreements());
  }

  useEffect(() => {
    reload();
  }, []);

  function addList() {
    if (!listName.trim() || !listCode.trim()) return;
    createPriceList({
      name: listName,
      code: listCode,
      adjustmentPercentage: Number(adjustment.replace(",", ".")) || 0,
    });
    setListName("");
    setListCode("");
    setAdjustment("0");
    reload();
  }

  function addAgreement() {
    if (!productId || !unitPrice) return;
    createPriceAgreement({
      priceListId,
      customerId,
      productId,
      variantId,
      minQuantity: Number(minQuantity) || 1,
      unitPrice: Number(unitPrice.replace(",", ".")) || 0,
      validFrom,
      validUntil,
    });
    setCustomerId("");
    setProductId("");
    setVariantId("");
    setMinQuantity("1");
    setUnitPrice("");
    setValidFrom("");
    setValidUntil("");
    reload();
  }

  function money(value: number) {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="Prijslijsten en prijsafspraken"
        description="Beheer prijslijsten, klantspecifieke prijzen en staffels."
      />

      <section className={styles.grid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">Prijslijsten</h2>
              <p className="content-card-description">Een algemene opslag of korting op de artikelprijs.</p>
            </div>
          </div>

          <div className={styles.formRow}>
            <input placeholder="Code" value={listCode} onChange={(e) => setListCode(e.target.value)} />
            <input placeholder="Naam" value={listName} onChange={(e) => setListName(e.target.value)} />
            <input type="number" step="0.1" placeholder="Aanpassing %" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} />
            <button className="button button-primary" type="button" onClick={addList}>Toevoegen</button>
          </div>

          <div className={styles.list}>
            {lists.map((item) => (
              <div className={styles.listItem} key={item.id}>
                <div>
                  <strong>{item.code} · {item.name}</strong>
                  <span>{item.adjustmentPercentage.toLocaleString("nl-NL")}% prijsaanpassing</span>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={(e) => {
                      updatePriceList(item.id, { isActive: e.target.checked });
                      reload();
                    }}
                  />
                  Actief
                </label>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">Nieuwe prijsafspraak</h2>
              <p className="content-card-description">Een vaste prijs per artikel, klant of staffel.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label><span>Prijslijst</span><select value={priceListId} onChange={(e) => setPriceListId(e.target.value)}>{lists.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><span>Klant (optioneel)</span><select value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Iedere klant op prijslijst</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.companyName}</option>)}</select></label>
            <label><span>Artikel</span><select value={productId} onChange={(e) => { setProductId(e.target.value); setVariantId(""); }}><option value="">Selecteer artikel</option>{products.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
            <label><span>Variant (optioneel)</span><select value={variantId} onChange={(e) => setVariantId(e.target.value)}><option value="">Alle varianten</option>{product?.variants.map((item) => <option key={item.id} value={item.id}>{item.color} · {item.size} · {item.sku}</option>)}</select></label>
            <label><span>Vanaf aantal</span><input type="number" min="1" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} /></label>
            <label><span>Verkoopprijs excl. btw</span><input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></label>
            <label><span>Geldig vanaf</span><input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></label>
            <label><span>Geldig tot</span><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
          </div>

          <div className={styles.actions}>
            <button className="button button-primary" type="button" onClick={addAgreement}>Prijsafspraak opslaan</button>
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">Actieve prijsafspraken</h2>
            <p className="content-card-description">Klantspecifieke afspraken krijgen altijd voorrang op prijslijststaffels.</p>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Prijslijst</th><th>Klant</th><th>Artikel</th><th>Variant</th><th className="table-number">Vanaf</th><th className="table-number">Prijs</th><th>Geldigheid</th><th /></tr></thead>
            <tbody>
              {agreements.map((item) => {
                const list = lists.find((entry) => entry.id === item.priceListId);
                const customer = customers.find((entry) => entry.id === item.customerId);
                const selectedProduct = products.find((entry) => entry.id === item.productId);
                const variant = selectedProduct?.variants.find((entry) => entry.id === item.variantId);
                return (
                  <tr key={item.id}>
                    <td>{list?.name || "—"}</td>
                    <td>{customer?.companyName || "Alle klanten"}</td>
                    <td className="table-primary">{selectedProduct ? `${selectedProduct.code} · ${selectedProduct.name}` : "Onbekend"}</td>
                    <td>{variant ? `${variant.color} · ${variant.size}` : "Alle varianten"}</td>
                    <td className="table-number">{item.minQuantity}</td>
                    <td className="table-number table-primary">{money(item.unitPrice)}</td>
                    <td>{item.validFrom || "Direct"} – {item.validUntil || "Onbeperkt"}</td>
                    <td className="table-number"><button className={styles.deleteButton} type="button" onClick={() => { deletePriceAgreement(item.id); reload(); }}>Verwijderen</button></td>
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
