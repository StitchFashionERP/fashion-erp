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

type CollectionForm = {
  code: string;
  name: string;
  season: string;
  year: string;
  status: CollectionStatus;
  startDate: string;
  endDate: string;
};

const emptyForm = (): CollectionForm => ({
  code: "",
  name: "",
  season: "Autumn / Winter",
  year: String(new Date().getFullYear() + 1),
  status: "Concept",
  startDate: "",
  endDate: "",
});

function getTone(status: CollectionStatus): StatusTone {
  if (status === "Actief") return "success";
  if (status === "Concept") return "info";
  return "neutral";
}

export default function CollectionsPage() {
  const [items, setItems] = useState<Collection[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CollectionForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

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

  function updateForm<K extends keyof CollectionForm>(
    field: K,
    value: CollectionForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  function startNewCollection() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  }

  function startEditCollection(item: Collection) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      season: item.season,
      year: String(item.year),
      status: item.status,
      startDate: item.startDate,
      endDate: item.endDate,
    });
    setError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveCollection() {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();

    if (!code || !name) {
      setError("Vul minimaal een code en naam in.");
      return;
    }

    const duplicateCode = items.some(
      (item) => item.id !== editingId && item.code.toUpperCase() === code,
    );

    if (duplicateCode) {
      setError("Deze collectiecode bestaat al.");
      return;
    }

    const now = new Date().toISOString();

    const existing = editingId
      ? items.find((item) => item.id === editingId)
      : undefined;

    const collection: Collection = {
      id: editingId ?? createMasterId("collection", name),
      code,
      name,
      active: form.status !== "Gearchiveerd",
      sortOrder: existing?.sortOrder ?? items.length + 1,
      notes: existing?.notes ?? "",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      season: form.season,
      year: Number(form.year) || new Date().getFullYear(),
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
    };

    if (editingId) {
      commit(items.map((item) => (item.id === editingId ? collection : item)));
    } else {
      commit([...items, collection]);
    }

    closeForm();
  }

  function deleteCollection(id: string) {
    if (!window.confirm("Collectie verwijderen?")) return;
    commit(items.filter((item) => item.id !== id));
    if (editingId === id) closeForm();
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
            onClick={startNewCollection}
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
              <h2 className="content-card-title">
                {editingId ? "Collectie bewerken" : "Nieuwe collectie"}
              </h2>
              <p className="content-card-description">
                {editingId
                  ? "Pas de gegevens van deze collectie aan."
                  : "Voeg een seizoen of doorlopende collectie toe."}
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Code</span>
              <input
                value={form.code}
                onChange={(event) => updateForm("code", event.target.value)}
              />
            </label>

            <label>
              <span>Naam</span>
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </label>

            <label>
              <span>Seizoen</span>
              <select
                value={form.season}
                onChange={(event) => updateForm("season", event.target.value)}
              >
                <option>Autumn / Winter</option>
                <option>Spring / Summer</option>
                <option>Pre Fall</option>
                <option>Resort</option>
                <option>Doorlopend</option>
              </select>
            </label>

            <label>
              <span>Jaar</span>
              <input
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(event) => updateForm("year", event.target.value)}
              />
            </label>

            <label>
              <span>Startdatum</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => updateForm("startDate", event.target.value)}
              />
            </label>

            <label>
              <span>Einddatum</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => updateForm("endDate", event.target.value)}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as CollectionStatus)
                }
              >
                <option>Concept</option>
                <option>Actief</option>
                <option>Gearchiveerd</option>
              </select>
            </label>
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <button
              className="button button-secondary"
              type="button"
              onClick={closeForm}
            >
              Annuleren
            </button>

            <button
              className="button button-primary"
              type="button"
              onClick={saveCollection}
            >
              {editingId ? "Wijzigingen opslaan" : "Collectie opslaan"}
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
                  <td className="table-number">
                    <div className={styles.actions}>
                      <button
                        className={styles.editButton}
                        type="button"
                        onClick={() => startEditCollection(item)}
                      >
                        Bewerken
                      </button>
                      <button
                        className={styles.deleteButton}
                        type="button"
                        onClick={() => deleteCollection(item.id)}
                      >
                        Verwijderen
                      </button>
                    </div>
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
