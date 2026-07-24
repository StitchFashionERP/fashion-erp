"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  defaultNumberSeries,
  formatNumber,
  getNumberSeries,
  resetNumberSeries,
  saveNumberSeries,
  type NumberSeries,
} from "@/lib/number-series";
import styles from "./number-series.module.css";

export default function NumberSeriesPage() {
  const [series, setSeries] = useState<NumberSeries[]>(defaultNumberSeries);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSeries(getNumberSeries());
  }, []);

  const activeCount = useMemo(() => series.filter((item) => item.active).length, [series]);

  function updateSeries(key: NumberSeries["key"], changes: Partial<NumberSeries>) {
    setSeries((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
    setSaved(false);
  }

  function handleSave() {
    saveNumberSeries(series);
    setSeries(getNumberSeries());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    if (!window.confirm("Alle nummerreeksen terugzetten naar de standaardinstellingen?")) return;
    setSeries(resetNumberSeries());
    setSaved(true);
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/instellingen">Instellingen</Link>
        <span>›</span>
        <span>Nummerreeksen</span>
      </div>

      <PageHeader
        eyebrow="Beheer"
        title="Nummerreeksen"
        description="Bepaal zelf hoe STiTch voorstellen voor artikel- en documentnummers opbouwt. Een voorstel blijft altijd overschrijfbaar."
        action={
          <div className="button-group">
            <button type="button" className="button button-secondary" onClick={handleReset}>Standaard herstellen</button>
            <button type="button" className="button button-primary" onClick={handleSave}>Instellingen opslaan</button>
          </div>
        }
      />

      {saved && <div className={styles.notification}>✓ Nummerreeksen zijn opgeslagen.</div>}

      <section className={styles.summary}>
        <div><span>Reeksen</span><strong>{series.length}</strong></div>
        <div><span>Actief</span><strong>{activeCount}</strong></div>
        <div><span>Werking</span><strong>Voorstel</strong></div>
      </section>

      <section className={`content-card ${styles.info}`}>
        <strong>Belangrijk</strong>
        <p>STiTch gebruikt deze nummerreeksen om een voorstel te doen. De gebruiker kan bij het aanmaken of importeren altijd een eigen nummer invullen.</p>
      </section>

      <section className={styles.list}>
        {series.map((item) => (
          <article key={item.key} className={`content-card ${styles.card}`}>
            <div className={styles.cardHeader}>
              <div>
                <h2>{item.label}</h2>
                <p>Volgend voorstel: <strong>{formatNumber(item, item.nextNumber)}</strong></p>
              </div>
              <label className={styles.switchLabel}>
                <input type="checkbox" checked={item.active} onChange={(event) => updateSeries(item.key, { active: event.target.checked })} />
                Actief
              </label>
            </div>

            <div className={styles.fields}>
              <label>
                <span>Prefix</span>
                <input value={item.prefix} maxLength={12} onChange={(event) => updateSeries(item.key, { prefix: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
              </label>
              <label>
                <span>Scheidingsteken</span>
                <input value={item.separator} maxLength={3} placeholder="Geen" onChange={(event) => updateSeries(item.key, { separator: event.target.value })} />
              </label>
              <label>
                <span>Volgend nummer</span>
                <input type="number" min={1} step={1} value={item.nextNumber} onChange={(event) => updateSeries(item.key, { nextNumber: Math.max(1, Number(event.target.value) || 1) })} />
              </label>
              <label>
                <span>Aantal cijfers</span>
                <input type="number" min={1} max={10} step={1} value={item.digits} onChange={(event) => updateSeries(item.key, { digits: Math.min(10, Math.max(1, Number(event.target.value) || 1)) })} />
              </label>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
