"use client";

import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getExactSyncLog,
  type ExactSyncLogEntry,
} from "@/lib/exact-bridge";
import styles from "./exact-log.module.css";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ExactSyncLogPage() {
  const [entries, setEntries] = useState<
    ExactSyncLogEntry[]
  >([]);

  useEffect(() => {
    setEntries(getExactSyncLog());
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Exact Online Bridge"
        title="Synchronisatielog"
        description="Auditlog van klantkoppelingen, imports, factuurexports en fouten."
      />

      <section className="content-card">
        <div className={styles.timeline}>
          {entries.map((entry) => (
            <article
              key={entry.id}
              className={styles.entry}
            >
              <div
                className={`${styles.marker} ${
                  entry.status === "Fout"
                    ? styles.errorMarker
                    : entry.status ===
                        "Waarschuwing"
                      ? styles.warningMarker
                      : styles.successMarker
                }`}
              />

              <div className={styles.content}>
                <header>
                  <div>
                    <strong>
                      {entry.action}
                    </strong>
                    <span>
                      {entry.entityType} ·{" "}
                      {dateTime(entry.createdAt)}
                    </span>
                  </div>

                  <span
                    className={
                      styles.status
                    }
                  >
                    {entry.status}
                  </span>
                </header>

                <p>{entry.message}</p>
              </div>
            </article>
          ))}
        </div>

        {entries.length === 0 && (
          <div className={styles.empty}>
            Nog geen synchronisatieactiviteiten.
          </div>
        )}
      </section>
    </div>
  );
}
