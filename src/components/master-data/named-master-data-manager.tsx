"use client";

import { useMemo, useState } from "react";
import type { NamedMasterData } from "@/lib/master-data";
import { createMasterId } from "@/lib/master-data";
import styles from "./named-master-data-manager.module.css";

type NamedMasterDataManagerProps = {
  title: string;
  description: string;
  idPrefix: string;
  initialItems: NamedMasterData[];
  onSave: (items: NamedMasterData[]) => void;
  codeLength?: number;
  codeMode?: "letters" | "numbers" | "mixed";
};

function suggestCode(name: string, mode: "letters" | "numbers" | "mixed", length?: number) {
  if (mode === "numbers") return "";

  const words = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const raw = words.length > 1
    ? words.map((word) => word[0]).join("")
    : (words[0] ?? "").slice(0, length ?? 3);

  return raw.toUpperCase().slice(0, length);
}

export function NamedMasterDataManager({
  title,
  description,
  idPrefix,
  initialItems,
  onSave,
  codeLength,
  codeMode = "mixed",
}: NamedMasterDataManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCode, setEditingCode] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query),
    );
  }, [items, search]);

  const activeCount = items.filter((item) => item.isActive).length;

  function commit(nextItems: NamedMasterData[]) {
    setItems(nextItems);
    onSave(nextItems);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!code) setCode(suggestCode(value, codeMode, codeLength));
  }

  function addItem() {
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanName || !cleanCode) return;

    const exists = items.some((item) =>
      item.name.toLowerCase() === cleanName.toLowerCase() ||
      item.code.toLowerCase() === cleanCode.toLowerCase(),
    );

    if (exists) {
      window.alert("Deze naam of code bestaat al.");
      return;
    }

    commit([...items, {
      id: createMasterId(idPrefix, cleanName),
      name: cleanName,
      code: cleanCode,
      isActive: true,
    }]);
    setName("");
    setCode("");
  }

  function startEditing(item: NamedMasterData) {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingCode(item.code);
  }

  function saveEditing() {
    if (!editingId) return;
    const cleanName = editingName.trim();
    const cleanCode = editingCode.trim().toUpperCase();
    if (!cleanName || !cleanCode) return;

    const exists = items.some((item) => item.id !== editingId && (
      item.name.toLowerCase() === cleanName.toLowerCase() ||
      item.code.toLowerCase() === cleanCode.toLowerCase()
    ));
    if (exists) {
      window.alert("Deze naam of code bestaat al.");
      return;
    }

    commit(items.map((item) => item.id === editingId
      ? { ...item, name: cleanName, code: cleanCode }
      : item));
    setEditingId(null);
  }

  function toggleItem(id: string) {
    commit(items.map((item) => item.id === id ? { ...item, isActive: !item.isActive } : item));
  }

  return (
    <article className="content-card">
      <div className="content-card-header">
        <div>
          <h2 className="content-card-title">{title}</h2>
          <p className="content-card-description">{description}</p>
        </div>
        <div className={styles.counter}>{activeCount} actief</div>
      </div>

      <div className={styles.addRow}>
        <input value={name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Naam" />
        <input
          value={code}
          maxLength={codeLength}
          inputMode={codeMode === "numbers" ? "numeric" : "text"}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder={codeMode === "numbers" ? "Code, bijv. 12" : "Code"}
          onKeyDown={(event) => { if (event.key === "Enter") addItem(); }}
        />
        <button className="button button-primary" type="button" onClick={addItem}>Toevoegen</button>
      </div>

      <div className={styles.searchRow}>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Zoeken binnen ${title.toLowerCase()}...`} />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Naam</th><th>Code</th><th>Status</th><th className="table-number">Acties</th></tr></thead>
          <tbody>
            {filteredItems.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <tr key={item.id}>
                  <td className="table-primary">
                    {isEditing ? <input className={styles.inlineInput} value={editingName} onChange={(e) => setEditingName(e.target.value)} /> : item.name}
                  </td>
                  <td>{isEditing ? <input className={styles.inlineInput} value={editingCode} maxLength={codeLength} onChange={(e) => setEditingCode(e.target.value.toUpperCase())} /> : item.code}</td>
                  <td><span className={item.isActive ? styles.active : styles.inactive}>{item.isActive ? "Actief" : "Inactief"}</span></td>
                  <td className={`table-number ${styles.actions}`}>
                    {isEditing ? (
                      <><button type="button" onClick={saveEditing}>Opslaan</button><button type="button" onClick={() => setEditingId(null)}>Annuleren</button></>
                    ) : (
                      <><button type="button" onClick={() => startEditing(item)}>Bewerken</button><button type="button" onClick={() => toggleItem(item.id)}>{item.isActive ? "Deactiveren" : "Activeren"}</button></>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
