"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/ui/page-header";
import {
  deleteEans,
  getEanPool,
  importEans,
  setEanBlocked,
  type EanImportResult,
  type EanPoolItem,
  type EanStatus,
} from "@/lib/ean-center";
import styles from "./ean-center.module.css";

const statusLabels: Record<EanStatus, string> = {
  AVAILABLE: "Vrij",
  ASSIGNED: "Toegewezen",
  BLOCKED: "Geblokkeerd",
};

export default function EanCenterPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EanPoolItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | EanStatus>("ALL");
  const [result, setResult] = useState<EanImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    refreshItems();
  }, []);

  function refreshItems() {
    try {
      setItems(getEanPool());
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "EAN-codes laden mislukt.",
      );
    }
  }

  const counts = useMemo(
    () => ({
      total: items.length,
      available: items.filter((item) => item.status === "AVAILABLE").length,
      assigned: items.filter((item) => item.status === "ASSIGNED").length,
      blocked: items.filter((item) => item.status === "BLOCKED").length,
    }),
    [items],
  );

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesStatus = status === "ALL" || item.status === status;
        const needle = query.trim().toLowerCase();
        const matchesQuery =
          !needle ||
          [
            item.ean,
            item.productCode,
            item.productName,
            item.variantLabel,
          ].some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(needle),
          );

        return matchesStatus && matchesQuery;
      }),
    [items, query, status],
  );

  async function parseFile(file: File) {
    const name = file.name.toLowerCase();

    if (
      !name.endsWith(".xlsx") &&
      !name.endsWith(".xls") &&
      !name.endsWith(".csv")
    ) {
      window.alert("Gebruik een Excel- of CSV-bestand.");
      return;
    }

    const workbook = name.endsWith(".csv")
      ? XLSX.read(await file.text(), { type: "string" })
      : XLSX.read(await file.arrayBuffer(), { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return;

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });

    const values = matrix.flatMap((row, rowIndex) => {
      if (
        rowIndex === 0 &&
        String(row[0] ?? "")
          .toLowerCase()
          .includes("ean")
      ) {
        return [];
      }

      return row.filter((value) => String(value ?? "").trim() !== "");
    });

    const nextResult = importEans(values);
    setResult(nextResult);
    refreshItems();
    setSelected([]);
  }

  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([["EAN"], ["8719324733823"]]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "EAN-codes");
    XLSX.writeFile(workbook, "STiTch-EAN-importsjabloon.xlsx");
  }

  function exportLog() {
    if (!result) return;

    const rows: Array<Array<string | number>> = [
      ["Resultaat", "Aantal"],
      ["Geïmporteerd", result.imported],
      ["Duplicaten", result.duplicates],
      ["Ongeldig", result.invalid],
      [],
      ["Overgeslagen regels"],
    ];

    result.skipped.forEach((line) => rows.push([line]));

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Importlog");
    XLSX.writeFile(workbook, "STiTch-EAN-importlog.xlsx");
  }

  function toggleSelection(ean: string) {
    setSelected((current) =>
      current.includes(ean)
        ? current.filter((value) => value !== ean)
        : [...current, ean],
    );
  }

  function handleDelete() {
    if (!selected.length) return;

    const assigned = items.filter(
      (item) =>
        selected.includes(item.ean) && item.status === "ASSIGNED",
    ).length;

    if (
      !window.confirm(
        `${selected.length - assigned} vrije/geblokkeerde EAN-code(s) verwijderen? Toegewezen codes blijven staan.`,
      )
    ) {
      return;
    }

    try {
      deleteEans(selected);
      refreshItems();
      setSelected([]);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Verwijderen mislukt.",
      );
    }
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/instellingen">Instellingen</Link>
        <span>›</span>
        <span>EAN Center</span>
      </div>

      <PageHeader
        eyebrow="Artikelbeheer"
        title="EAN Center"
        description="Importeer gekochte EAN-codes en beheer de centrale voorraad van vrije, toegewezen en geblokkeerde codes."
        action={
          <div className="button-group">
            <button
              className="button button-secondary"
              type="button"
              onClick={downloadTemplate}
            >
              Excel-sjabloon
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              EAN-codes importeren
            </button>
          </div>
        }
      />

      <section className={styles.summary}>
        <div>
          <span>Totaal gekocht</span>
          <strong>{counts.total}</strong>
        </div>
        <div>
          <span>Beschikbaar</span>
          <strong>{counts.available}</strong>
        </div>
        <div>
          <span>Toegewezen</span>
          <strong>{counts.assigned}</strong>
        </div>
        <div>
          <span>Geblokkeerd</span>
          <strong>{counts.blocked}</strong>
        </div>
      </section>

      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void parseFile(file);
          event.currentTarget.value = "";
        }}
      />

      <section
        className={`${styles.dropzone} ${
          dragging ? styles.dropzoneActive : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void parseFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <strong>Sleep je Excel- of CSV-bestand hierheen</strong>
        <span>
          Gebruik één kolom met als koptekst EAN. Alleen geldige EAN-13-codes
          worden toegevoegd.
        </span>
      </section>

      {result && (
        <section className={styles.result}>
          <div>
            <strong>{result.imported}</strong>
            <span>nieuw toegevoegd</span>
          </div>
          <div>
            <strong>{result.duplicates}</strong>
            <span>duplicaten</span>
          </div>
          <div>
            <strong>{result.invalid}</strong>
            <span>ongeldig</span>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={exportLog}
          >
            Importlog downloaden
          </button>
        </section>
      )}

      <section className={`content-card ${styles.tableCard}`}>
        <div className={styles.toolbar}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek op EAN, artikel of variant"
          />

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "ALL" | EanStatus)
            }
          >
            <option value="ALL">Alle statussen</option>
            <option value="AVAILABLE">Vrij</option>
            <option value="ASSIGNED">Toegewezen</option>
            <option value="BLOCKED">Geblokkeerd</option>
          </select>

          <span>{filtered.length} resultaten</span>

          {selected.length > 0 && (
            <button
              className="button button-secondary"
              type="button"
              onClick={handleDelete}
            >
              Selectie verwijderen
            </button>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>EAN</th>
                <th>Status</th>
                <th>Artikel</th>
                <th>Variant</th>
                <th>Geïmporteerd</th>
                <th>Actie</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.ean}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.ean)}
                      onChange={() => toggleSelection(item.ean)}
                    />
                  </td>

                  <td>
                    <strong>{item.ean}</strong>
                  </td>

                  <td>
                    <span
                      className={`${styles.status} ${
                        styles[item.status.toLowerCase()]
                      }`}
                    >
                      {statusLabels[item.status]}
                    </span>
                  </td>

                  <td>
                    {item.productName ? (
                      <>
                        <strong>{item.productName}</strong>
                        {item.productCode && <small>{item.productCode}</small>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>{item.variantLabel || "—"}</td>

                  <td>
                    {new Date(item.importedAt).toLocaleDateString("nl-NL")}
                  </td>

                  <td>
                    {item.status === "ASSIGNED" ? (
                      <span className={styles.muted}>In gebruik</span>
                    ) : (
                      <button
                        className={styles.linkButton}
                        type="button"
                        onClick={() => {
                          try {
                            setEanBlocked(
                              item.ean,
                              item.status !== "BLOCKED",
                            );
                            refreshItems();
                          } catch (error) {
                            window.alert(
                              error instanceof Error
                                ? error.message
                                : "Bijwerken mislukt.",
                            );
                          }
                        }}
                      >
                        {item.status === "BLOCKED"
                          ? "Vrijgeven"
                          : "Blokkeren"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Nog geen EAN-codes gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
