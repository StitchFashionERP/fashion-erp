"use client";

import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getDebtorDashboard,
  getDebtorInvoices,
  sendInvoiceReminder,
  syncMockExactPayments,
} from "@/lib/debtor-management";
import styles from "./debtors.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function date(value: string) {
  return value
    ? new Intl.DateTimeFormat("nl-NL").format(
        new Date(`${value}T12:00:00`),
      )
    : "—";
}

export default function DebtorsPage() {
  const [rows, setRows] = useState<
    ReturnType<typeof getDebtorInvoices>
  >([]);
  const [dashboard, setDashboard] =
    useState(getDebtorDashboard());
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  function reload() {
    setRows(getDebtorInvoices());
    setDashboard(getDebtorDashboard());
  }

  useEffect(() => {
    reload();
  }, []);

  async function sendReminder(
    invoiceId: string,
  ) {
    try {
      const log = await sendInvoiceReminder(
        invoiceId,
      );

      setMessage(
        `${log.level} voor ${log.invoiceNumber} is vanuit STITCH verstuurd.`,
      );
      setError("");
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Versturen is niet gelukt.",
      );
      setMessage("");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Debiteuren"
        title="Openstaande posten"
        description="STITCH verstuurt facturen, betalingsherinneringen en aanmaningen. Exact levert later de bank- en betaalstatus terug."
        action={
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              syncMockExactPayments();
              reload();
              setMessage(
                "Mock-betaalstatus vanuit Exact is verwerkt.",
              );
            }}
          >
            Betaalstatus ophalen
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
            Openstaand
          </div>
          <div className="metric-value">
            {money(dashboard.openAmount)}
          </div>
          <div className="metric-detail">
            alle open facturen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Vervallen
          </div>
          <div className="metric-value">
            {money(dashboard.overdueAmount)}
          </div>
          <div className="metric-detail">
            {dashboard.overdueInvoices} facturen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Oudste post
          </div>
          <div className="metric-value">
            {dashboard.oldestDays}
          </div>
          <div className="metric-detail">
            dagen vervallen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Communicatie
          </div>
          <div className="metric-value">
            {dashboard.remindersSent}
          </div>
          <div className="metric-detail">
            herinneringen verstuurd
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Factuur</th>
                <th>Klant</th>
                <th>Vervaldatum</th>
                <th className="table-number">
                  Totaal
                </th>
                <th className="table-number">
                  Openstaand
                </th>
                <th>Exact-klant</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.invoice.id}>
                  <td className="table-primary">
                    {row.invoice.invoiceNumber}
                  </td>

                  <td>
                    {row.invoice.customerName}
                    <div className={styles.meta}>
                      {row.invoice.email}
                    </div>
                  </td>

                  <td>
                    {date(row.invoice.dueDate)}
                    {row.daysPastDue > 0 && (
                      <div
                        className={styles.overdue}
                      >
                        {row.daysPastDue} dagen
                        vervallen
                      </div>
                    )}
                  </td>

                  <td className="table-number">
                    {money(row.invoice.total)}
                  </td>

                  <td className="table-number table-primary">
                    {money(row.outstanding)}
                  </td>

                  <td>
                    {row.exactCustomerCode || "—"}
                  </td>

                  <td>
                    {row.outstanding <= 0
                      ? "Betaald"
                      : row.suggestedReminder}
                    {row.latestReminder && (
                      <div className={styles.meta}>
                        Laatst:{" "}
                        {row.latestReminder.level}
                      </div>
                    )}
                  </td>

                  <td className="table-number">
                    {row.outstanding > 0 &&
                      row.suggestedReminder !==
                        "Geen" && (
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() =>
                            sendReminder(
                              row.invoice.id,
                            )
                          }
                        >
                          {row.suggestedReminder}
                        </button>
                      )}
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
