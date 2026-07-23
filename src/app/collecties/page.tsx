"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createMasterId,
  getCollections,
  saveCollections,
  type Collection,
  type CollectionStatus,
} from "@/lib/master-data";
import styles from "./collections.module.css";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

function getTone(status: CollectionStatus): StatusTone {
  if (status === "Actief") return "success";
  if (status === "Concept") return "info";
  return "neutral";
}

export default function CollectionsPage() {
  const [items, setItems] = useState<Collection[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [season, setSeason] = useState("Autumn / Winter");
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [status, setStatus] = useState<CollectionStatus>("Concept");

  useEffect(() => {
    setItems(getCollections());
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query),
    );
  }, [items, search]);

  function commit(nextItems: Collection[]) {
    setItems(nextItems);
    saveCollections(nextItems);
  }

  function addCollection() {
    if (!code.trim() || !name.trim()) return;

    const next: Collection = {
      id: createMasterId("collection", name),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      season,
      year: Number(year) || new Date().getFullYear(),
      status,
      startDate: "",
      endDate: "",
    };

    commit([...items, next]);

    setCode("");
    setName("");
    setShowForm(false);
  }

  function deleteCollection(id: string) {
    if (!window.confirm("Collectie verwijderen?")) return;
    commit(items.filter((item) => item.id !== id));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Assortiment"
        title="Collecties"
        description="Beheer seizoenen en groepeer artikelen per collectie."
        action={
          <button
            className="button button-primary"
            type="button"
            onClick={() => setShowForm((current) => !current)}
          >
            <span className="button-plus">+</span>
            Nieuwe collectie
          </button>
        }
      />

      {showForm && (
        <section className={`content-card ${styles.formCard}`}>
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">Nieuwe collectie</h2>
              <p className="content-card-description">
                Voeg een seizoen of doorlopende collectie toe.
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} />
            </label>

            <label>
              <span>Naam</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label>
              <span>Seizoen</span>
              <select value={season} onChange={(e) => setSeason(e.target.value)}>
                <option>Autumn / Winter</option>
                <option>Spring / Summer</option>
                <option>Pre Fall</option>
                <option>Resort</option>
                <option>Doorlopend</option>
              </select>
            </label>

            <label>
              <span>Jaar</span>
              <input value={year} onChange={(e) => setYear(e.target.value)} />
            </label>

            <label>
              <span>Status</span>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as CollectionStatus)
                }
              >
                <option>Concept</option>
                <option>Actief</option>
                <option>Gearchiveerd</option>
              </select>
            </label>
          </div>

          <div className={styles.formActions}>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Annuleren
            </button>

            <button
              className="button button-primary"
              type="button"
              onClick={addCollection}
            >
              Collectie opslaan
            </button>
          </div>
        </section>
      )}

      <section className="content-card">
        <div className="content-card-toolbar">
          <div className="table-search">
            <span>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Zoek op code of collectie..."
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Collectie</th>
                <th>Seizoen</th>
                <th>Jaar</th>
                <th>Status</th>
                <th className="table-number">Acties</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="table-primary">{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.season}</td>
                  <td>{item.year}</td>
                  <td>
                    <StatusBadge label={item.status} tone={getTone(item.status)} />
                  </td>
                  <td className={`table-number ${styles.actions}`}>
                    <button
                      type="button"
                      onClick={() => deleteCollection(item.id)}
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
