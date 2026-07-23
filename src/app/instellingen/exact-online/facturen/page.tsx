"use client";

import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  exportInvoiceToExactSandbox,
  getExactInvoiceExports,
  syncInvoiceExportQueue,
  type ExactInvoiceExport,
} from "@/lib/exact-bridge";
import styles from "./exact-invoices.module.css";

export default function ExactInvoicesPage() {
  const [items, setItems] = useState<
    ExactInvoiceExport[]
  >([]);
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  function reload() {
    syncInvoiceExportQueue();
    setItems(getExactInvoiceExports());
  }

  useEffect(() => {
    reload();
  }, []);

  function exportInvoice(
    invoiceId: string,
    invoiceNumber: string,
  ) {
    try {
      exportInvoiceToExactSandbox(invoiceId);
      setMessage(
        `${invoiceNumber} is naar de Exact-sandbox geëxporteerd.`,
      );
      setError("");
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Export mislukt.",
      );
      setMessage("");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Exact Online Bridge"
        title="Factuurexport"
        description="Iedere STITCH-factuur wordt één verkoopfactuur op dezelfde klant in Exact."
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

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Exportwachtrij
            </h2>
            <p className="content-card-description">
              Het STITCH-factuurnummer wordt als
              referentie gebruikt.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>STITCH-factuur</th>
                <th>Klant</th>
                <th>Exact-klant</th>
                <th>Referentie</th>
                <th>Status</th>
                <th>Pogingen</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="table-primary">
                    {item.invoiceNumber}
                  </td>
                  <td>{item.customerName}</td>
                  <td>
                    {item.exactCustomerCode || "—"}
                  </td>
                  <td>{item.stitchReference}</td>
                  <td>
                    <span
                      className={`${styles.status} ${
                        item.status ===
                        "Geëxporteerd"
                          ? styles.successStatus
                          : item.status ===
                              "Geblokkeerd" ||
                            item.status === "Fout"
                            ? styles.errorStatus
                            : styles.waitingStatus
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.lastError && (
                      <div className={styles.meta}>
                        {item.lastError}
                      </div>
                    )}
                  </td>
                  <td>{item.attempts}</td>
                  <td className="table-number">
                    {item.status !==
                      "Geëxporteerd" && (
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() =>
                          exportInvoice(
                            item.invoiceId,
                            item.invoiceNumber,
                          )
                        }
                      >
                        Exporteren
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className={styles.empty}>
            Er zijn nog geen definitieve of
            verzonden facturen om te exporteren.
          </div>
        )}
      </section>
    </div>
  );
}
