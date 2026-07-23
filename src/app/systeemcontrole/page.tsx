"use client";

import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  runWorkflowAudit,
  type AuditCheck,
} from "@/lib/workflow-audit";
import styles from "./stability.module.css";

export default function StabilityPage() {
  const [checks, setChecks] = useState<
    AuditCheck[]
  >([]);

  function reload() {
    setChecks(runWorkflowAudit());
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Beheer"
        title="Systeemcontrole"
        description="Controleer de belangrijkste keten van verkoop, facturatie, retouren, inkoop en historie."
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={reload}
          >
            Controle opnieuw uitvoeren
          </button>
        }
      />

      <section className={styles.grid}>
        {checks.map((check) => (
          <article
            key={check.label}
            className="content-card"
          >
            <div className={styles.card}>
              <div>
                <strong>{check.label}</strong>
                <p>{check.detail}</p>
              </div>
              <span
                className={
                  check.status === "Goed"
                    ? styles.good
                    : check.status === "Fout"
                      ? styles.bad
                      : styles.warning
                }
              >
                {check.status}
              </span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
