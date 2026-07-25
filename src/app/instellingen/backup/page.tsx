"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  downloadStitchBackup,
  inspectLocalStorage,
  restoreStitchBackup,
  type LocalStorageInspection,
} from "@/lib/backup";
import styles from "./backup.module.css";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupPage() {
  const [entries, setEntries] = useState<LocalStorageInspection[]>([]);
  const [computerLabel, setComputerLabel] = useState("daan");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshInspection = () => {
    try {
      setEntries(inspectLocalStorage());
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Lokale opslag kon niet worden gelezen.");
    }
  };

  useEffect(() => {
    refreshInspection();
  }, []);

  const groupedEntries = useMemo(() => {
    return entries.reduce<Record<string, LocalStorageInspection[]>>((groups, entry) => {
      groups[entry.category] ??= [];
      groups[entry.category].push(entry);
      return groups;
    }, {});
  }, [entries]);

  const totalBytes = entries.reduce((sum, entry) => sum + entry.byteSize, 0);
  const totalDetectedItems = entries.reduce((sum, entry) => sum + (entry.itemCount ?? 0), 0);

  const handleDownload = () => {
    try {
      const filename = downloadStitchBackup(computerLabel);
      setSuccess(`Back-up gedownload: ${filename}`);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Downloaden is mislukt.");
      setSuccess("");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Dataveiligheid"
        title="Lokale data veiligstellen"
        description="Download eerst op iedere computer een volledige back-up. Wis of herstel nog niets voordat beide bestanden veilig zijn opgeslagen."
      />

      {error && <div className={styles.error}>! {error}</div>}
      {success && <div className={styles.success}>✓ {success}</div>}

      <section className={`content-card ${styles.heroCard}`}>
        <div>
          <span className={styles.statusBadge}>Stap 1 van de migratie</span>
          <h2>Download op deze computer een lokale back-up</h2>
          <p>
            Deze export bevat alle gegevens die deze browser lokaal bewaart, inclusief oudere opslagcodes. De export wijzigt of verwijdert niets.
          </p>
        </div>

        <div className={styles.downloadPanel}>
          <label htmlFor="computer-label">Naam van deze computer</label>
          <input
            id="computer-label"
            value={computerLabel}
            onChange={(event) => setComputerLabel(event.target.value)}
            placeholder="Bijvoorbeeld Daan of Kim"
          />
          <button type="button" className="button button-primary" onClick={handleDownload}>
            Volledige lokale back-up downloaden
          </button>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <article className="content-card">
          <span>Opslagsleutels</span>
          <strong>{entries.length}</strong>
          <small>gevonden in deze browser</small>
        </article>
        <article className="content-card">
          <span>Herkenbare records</span>
          <strong>{totalDetectedItems}</strong>
          <small>indicatieve telling</small>
        </article>
        <article className="content-card">
          <span>Totale grootte</span>
          <strong>{formatBytes(totalBytes)}</strong>
          <small>lokale browserdata</small>
        </article>
      </section>

      <section className={`content-card ${styles.inspectorCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Storage Inspector</h2>
            <p>Hier zie je welke lokale gegevens op deze computer aanwezig zijn.</p>
          </div>
          <button type="button" className="button button-secondary" onClick={refreshInspection}>
            Opnieuw controleren
          </button>
        </div>

        {entries.length === 0 ? (
          <div className={styles.emptyState}>
            Er is geen lokale browserdata gevonden. Controleer of je dit scherm op de computer opent waarop de gegevens zichtbaar zijn.
          </div>
        ) : (
          <div className={styles.groups}>
            {Object.entries(groupedEntries).map(([category, categoryEntries]) => (
              <div className={styles.group} key={category}>
                <h3>{category}</h3>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Opslagsleutel</th>
                        <th>Type</th>
                        <th>Records</th>
                        <th>Grootte</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryEntries.map((entry) => (
                        <tr key={entry.key}>
                          <td><code>{entry.key}</code></td>
                          <td>{entry.detectedType}</td>
                          <td>{entry.itemCount ?? "—"}</td>
                          <td>{formatBytes(entry.byteSize)}</td>
                          <td><span className={styles.localBadge}>Lokaal</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`content-card ${styles.restoreCard}`}>
        <div>
          <h2>Back-up herstellen</h2>
          <p>Gebruik dit nu nog niet. Deze functie blijft beschikbaar voor noodgevallen, maar kan bestaande lokale gegevens overschrijven.</p>
        </div>
        <label className={`button button-secondary ${styles.restoreButton}`}>
          Back-upbestand kiezen
          <input
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              const confirmed = window.confirm(
                "Weet je zeker dat je deze back-up wilt herstellen? Bestaande lokale gegevens met dezelfde sleutels worden overschreven.",
              );

              if (!confirmed) {
                event.target.value = "";
                return;
              }

              try {
                await restoreStitchBackup(file);
              } catch (caughtError) {
                setError(caughtError instanceof Error ? caughtError.message : "Herstellen is mislukt.");
              }
            }}
          />
        </label>
      </section>
    </div>
  );
}
