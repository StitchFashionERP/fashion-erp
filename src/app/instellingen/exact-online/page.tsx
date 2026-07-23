"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  exportAllQueuedInvoices,
  getExactBridgeDashboard,
  getExactBridgeSettings,
  saveExactBridgeSettings,
  syncAllCustomersToExact,
  testExactSandboxConnection,
  type ExactBridgeSettings,
} from "@/lib/exact-bridge";
import styles from "./exact-online.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function ExactOnlineBridgePage() {
  const [settings, setSettings] =
    useState<ExactBridgeSettings | null>(
      null,
    );
  const [dashboard, setDashboard] =
    useState({
      connection: "Niet gekoppeld",
      linkedCustomers: 0,
      totalCustomers: 0,
      queuedInvoices: 0,
      blockedInvoices: 0,
      exportedInvoices: 0,
      openAmount: 0,
    });
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  function reload() {
    setSettings(getExactBridgeSettings());
    setDashboard(getExactBridgeDashboard());
  }

  useEffect(() => {
    reload();
  }, []);

  if (!settings) {
    return null;
  }

  function runAction(
    action: () => void,
    successMessage: string,
  ) {
    try {
      action();
      setMessage(successMessage);
      setError("");
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Actie mislukt.",
      );
      setMessage("");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Integraties"
        title="Exact Online Bridge"
        description="Test de klant- en factuursynchronisatie zonder een echte Exact Online-verbinding."
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={() =>
              runAction(
                () => {
                  testExactSandboxConnection();
                },
                "Sandboxverbinding getest.",
              )
            }
          >
            Test sandbox
          </button>
        }
      />

      {message && (
        <div className={styles.success}>
          ✓ {message}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          ! {error}
        </div>
      )}

      <section className={styles.metricGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Verbinding
          </div>
          <div className={styles.statusValue}>
            {dashboard.connection}
          </div>
          <div className="metric-detail">
            mock-adapter
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Klanten gekoppeld
          </div>
          <div className="metric-value">
            {dashboard.linkedCustomers}
          </div>
          <div className="metric-detail">
            van {dashboard.totalCustomers}
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Facturen in wachtrij
          </div>
          <div className="metric-value">
            {dashboard.queuedInvoices}
          </div>
          <div className="metric-detail">
            {dashboard.blockedInvoices} geblokkeerd
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Openstaand in Exact
          </div>
          <div className="metric-value">
            {money(dashboard.openAmount)}
          </div>
          <div className="metric-detail">
            sandboxdata
          </div>
        </article>
      </section>

      <section className={styles.moduleGrid}>
        <Link
          href="/instellingen/exact-online/klanten"
          className={styles.moduleCard}
        >
          <span className={styles.moduleIcon}>
            ○
          </span>
          <div>
            <h2>Klanten synchroniseren</h2>
            <p>
              Koppel STITCH-klanten, importeer
              mockklanten uit Exact en bekijk
              openstaande posten.
            </p>
          </div>
          <span>→</span>
        </Link>

        <Link
          href="/instellingen/exact-online/facturen"
          className={styles.moduleCard}
        >
          <span className={styles.moduleIcon}>
            ≡
          </span>
          <div>
            <h2>Facturen exporteren</h2>
            <p>
              Zet iedere definitieve
              STITCH-factuur één-op-één door naar
              Exact met hetzelfde factuurnummer als
              referentie.
            </p>
          </div>
          <span>→</span>
        </Link>

        <Link
          href="/instellingen/exact-online/logboek"
          className={styles.moduleCard}
        >
          <span className={styles.moduleIcon}>
            ↻
          </span>
          <div>
            <h2>Synchronisatielog</h2>
            <p>
              Bekijk klantimports, factuurexports,
              fouten en herhaalpogingen.
            </p>
          </div>
          <span>→</span>
        </Link>
      </section>

      <section className={styles.settingsGrid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Sandboxinstellingen
              </h2>
              <p className="content-card-description">
                Deze waarden worden later gebruikt
                door de echte OAuth- en API-adapter.
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Administratiecode</span>
              <input
                value={
                  settings.administrationCode
                }
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          administrationCode:
                            event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>

            <label>
              <span>Administratienaam</span>
              <input
                value={
                  settings.administrationName
                }
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          administrationName:
                            event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>

            <label>
              <span>Verkoopdagboek</span>
              <input
                value={settings.salesJournalCode}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          salesJournalCode:
                            event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>

            <label>
              <span>Omzetrekening</span>
              <input
                value={
                  settings.revenueAccountCode
                }
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          revenueAccountCode:
                            event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>

            <label>
              <span>BTW-code</span>
              <input
                value={settings.vatCode}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          vatCode:
                            event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>
          </div>

          <div className={styles.switchList}>
            <label>
              <input
                type="checkbox"
                checked={
                  settings.syncCustomersAutomatically
                }
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          syncCustomersAutomatically:
                            event.target.checked,
                        }
                      : current,
                  )
                }
              />
              Klanten automatisch synchroniseren
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  settings.exportInvoicesAutomatically
                }
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          exportInvoicesAutomatically:
                            event.target.checked,
                        }
                      : current,
                  )
                }
              />
              Definitieve facturen automatisch in
              wachtrij zetten
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.importOpenItems}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          importOpenItems:
                            event.target.checked,
                        }
                      : current,
                  )
                }
              />
              Openstaande posten terughalen
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className="button button-primary"
              onClick={() =>
                runAction(
                  () => {
                    saveExactBridgeSettings(
                      settings,
                    );
                  },
                  "Instellingen opgeslagen.",
                )
              }
            >
              Instellingen opslaan
            </button>
          </div>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Snelle acties
              </h2>
            </div>
          </div>

          <div className={styles.quickActions}>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => {
                    syncAllCustomersToExact();
                  },
                  "Alle klanten zijn naar de sandbox gesynchroniseerd.",
                )
              }
            >
              <strong>
                Alle klanten synchroniseren
              </strong>
              <span>
                STITCH is leidend, inclusief
                betalingstermijn.
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                runAction(
                  () => {
                    const result =
                      exportAllQueuedInvoices();

                    if (
                      result.errors.length > 0
                    ) {
                      throw new Error(
                        result.errors.join(" "),
                      );
                    }
                  },
                  "Alle beschikbare facturen zijn geëxporteerd.",
                )
              }
            >
              <strong>
                Exportwachtrij verwerken
              </strong>
              <span>
                Eén STITCH-factuur wordt één
                Exact-verkoopfactuur.
              </span>
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
