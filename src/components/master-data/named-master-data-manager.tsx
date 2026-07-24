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
  numericCode?: boolean;
};

function suggestCode(name: string, length?: number, numericCode?: boolean) {
  if (numericCode) return "";
  const words = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "";
  const max = length ?? 3;
  const suggestion = words.length > 1
    ? words.map((word) => word[0]).join("")
    : words[0].slice(0, max);
  return suggestion.toUpperCase().slice(0, max);
}

export function NamedMasterDataManager({
  title,
  description,
  idPrefix,
  initialItems,
  onSave,
  codeLength,
  numericCode = false,
}: NamedMasterDataManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.code.toLowerCase().includes(query),
    );
  }, [items, search]);

  function commit(nextItems: NamedMasterData[]) {
    setItems(nextItems);
    onSave(nextItems);
  }

  function normalizeCode(value: string) {
    const cleaned = numericCode
      ? value.replace(/\D/g, "")
      : value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return codeLength ? cleaned.slice(0, codeLength) : cleaned;
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!code) setCode(suggestCode(value, codeLength, numericCode));
  }

  function addItem() {
    const cleanName = name.trim();
    const cleanCode = normalizeCode(code.trim());
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
    setEditName(item.name);
    setEditCode(item.code);
  }

  function saveEdit() {
    if (!editingId) return;
    const cleanName = editName.trim();
    const cleanCode = normalizeCode(editCode.trim());
    if (!cleanName || !cleanCode) return;

    const exists = items.some((item) =>
      item.id !== editingId && (
        item.name.toLowerCase() === cleanName.toLowerCase() ||
        item.code.toLowerCase() === cleanCode.toLowerCase()
      ),
    );
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
    commit(items.map((item) => item.id === id
      ? { ...item, isActive: !item.isActive }
      : item));
  }

  return (
    <article className="content-card">
      <div className="content-card-header">
        <div>
          <h2 className="content-card-title">{title}</h2>
          <p className="content-card-description">{description}</p>
        </div>
      </div>

      <div className={styles.addRow}>
        <input value={name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Naam" />
        <input
          value={code}
          onChange={(event) => setCode(normalizeCode(event.target.value))}
          placeholder={numericCode ? "Code (bijv. 12)" : "Code"}
          inputMode={numericCode ? "numeric" : "text"}
          maxLength={codeLength}
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
              const editing = editingId === item.id;
              return (
                <tr key={item.id}>
                  <td className="table-primary">
                    {editing ? <input className={styles.inlineInput} value={editName} onChange={(e) => setEditName(e.target.value)} /> : item.name}
                  </td>
                  <td>
                    {editing ? <input className={styles.inlineCode} value={editCode} onChange={(e) => setEditCode(normalizeCode(e.target.value))} maxLength={codeLength} /> : item.code}
                  </td>
                  <td>{item.isActive ? "Actief" : "Inactief"}</td>
                  <td className={`table-number ${styles.actions}`}>
                    {editing ? (
                      <><button type="button" onClick={saveEdit}>Opslaan</button><button type="button" onClick={() => setEditingId(null)}>Annuleren</button></>
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
