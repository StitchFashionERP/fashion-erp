"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentActionButtons } from "@/components/documents/document-action-buttons";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deleteInvoice,
  getInvoiceById,
  getInvoiceOutstandingAmount,
  getInvoicePaidAmount,
  makeInvoiceFinal,
  markInvoiceSent,
  registerInvoicePayment,
  type Invoice,
} from "@/lib/invoice-api";
import styles from "./invoice-detail.module.css";
import { groupInvoiceLines } from "@/lib/invoice-lines-view";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL").format(
    new Date(`${value}T12:00:00`),
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] =
    useState<Invoice | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [showPayment, setShowPayment] =
    useState(false);
  const [paymentDate, setPaymentDate] =
    useState(
      new Date().toISOString().slice(0, 10),
    );
  const [paymentAmount, setPaymentAmount] =
    useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("Bankoverschrijving");
  const [paymentReference, setPaymentReference] =
    useState("");

  useEffect(() => {
    async function loadInvoice() {
      const selectedInvoice =
        await getInvoiceById(params.id);

      setInvoice(selectedInvoice);

      if (selectedInvoice) {
        setPaymentAmount(
          getInvoiceOutstandingAmount(
            selectedInvoice,
          )
            .toFixed(2)
            .replace(".", ","),
        );
      }

      setLoaded(true);
    }

    loadInvoice();
  }, [params.id]);

  if (!loaded) {
    return (
      <section className="content-card">
        <div className={styles.loading}>
          Factuur laden...
        </div>
      </section>
    );
  }

  if (!invoice) {
    return (
      <section className="content-card">
        <div className={styles.notFound}>
          <h1>Factuur niet gevonden</h1>

          <Link
            href="/facturen"
            className="button button-primary"
          >
            Terug naar facturen
          </Link>
        </div>
      </section>
    );
  }

  const articleBlocks =
    groupInvoiceLines(
      invoice.lines,
    );

  const invoiceSizes = Array.from(
    new Set(
      articleBlocks.flatMap(
        (block) => block.sizes ?? [],
      ),
    ),
  );

  console.log(
    "INVOICE BLOCKS",
    articleBlocks,
    "SIZES",
    invoiceSizes,
  );

  const paidAmount =
    getInvoicePaidAmount(invoice);

  const outstandingAmount =
    getInvoiceOutstandingAmount(invoice);

  async function execute(
    action: () => Promise<Invoice>,
  ) {
    setError("");

    try {
      setInvoice(await action());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De actie kon niet worden uitgevoerd.",
      );
    }
  }

  async function handlePayment() {
    if (!invoice) {
      setError("Factuur niet gevonden.");
      return;
    }

    setError("");

    try {
      await registerInvoicePayment(
        invoice.id,
        {
          paymentDate,
          amount:
            Number(
              paymentAmount.replace(",", "."),
            ) || 0,
          method: paymentMethod,
          reference: paymentReference,
        },
      );

      const updated =
        await getInvoiceById(invoice.id);

      if (!updated) {
        throw new Error(
          "Factuur kon niet opnieuw geladen worden.",
        );
      }

      setInvoice(updated);
      setShowPayment(false);
      setPaymentReference("");

      setPaymentAmount(
        getInvoiceOutstandingAmount(updated)
          .toFixed(2)
          .replace(".", ","),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De betaling kon niet worden geregistreerd.",
      );
    }
  }

  function handleDelete() {
    if (!invoice) {
      setError("Factuur niet gevonden.");
      return;
    }

    if (
      !window.confirm(
        "Weet je zeker dat je deze conceptfactuur wilt verwijderen?",
      )
    ) {
      return;
    }

    try {
      deleteInvoice(invoice.id);
      router.push("/facturen");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De factuur kon niet worden verwijderd.",
      );
    }
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/facturen">
          Facturen
        </Link>
        <span>›</span>
        <span>{invoice.invoiceNumber}</span>
      </div>

      <PageHeader
        eyebrow="Verkoopfactuur"
        title={invoice.invoiceNumber}
        description={`${invoice.customerName} · Verkooporder ${invoice.salesOrderNumber}`}
        action={
          <div className="button-group">
            <DocumentActionButtons
              referenceId={invoice.id}
              documentType="INVOICE"
              printLabel="Factuur PDF"
              emailLabel="Factuur mailen"
              onSent={() => {
                if (invoice.status === "Definitief") {
                  execute(() =>
                    markInvoiceSent(invoice.id),
                  );
                }
              }}
            />

            {invoice.status !== "Verzonden" &&
 invoice.status !== "Betaald" &&
 invoice.status !== "Deels betaald" &&
 invoice.status !== "Gecrediteerd" && (
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  execute(() =>
                    makeInvoiceFinal(invoice.id),
                  )
                }
              >
                Definitief maken
              </button>
            )}

            {invoice.status === "Definitief" && (
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  execute(() =>
                    markInvoiceSent(invoice.id),
                  )
                }
              >
                Markeren als verzonden
              </button>
            )}

            {outstandingAmount > 0 &&
              invoice.status !== "Concept" &&
              invoice.status !==
                "Gecrediteerd" && (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() =>
                    setShowPayment(
                      (current) => !current,
                    )
                  }
                >
                  Betaling registreren
                </button>
              )}
          </div>
        }
      />

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {showPayment && (
        <section
          className={`content-card ${styles.paymentCard}`}
        >
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Betaling registreren
              </h2>

              <p className="content-card-description">
                Leg een volledige of gedeeltelijke betaling
                vast.
              </p>
            </div>
          </div>

          <div className={styles.paymentGrid}>
            <label>
              <span>Betaaldatum</span>

              <input
                type="date"
                value={paymentDate}
                onChange={(event) =>
                  setPaymentDate(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Bedrag</span>

              <input
                value={paymentAmount}
                onChange={(event) =>
                  setPaymentAmount(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Betaalmethode</span>

              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value,
                  )
                }
              >
                <option>Bankoverschrijving</option>
                <option>Contant</option>
                <option>Creditcard</option>
                <option>Correctie</option>
              </select>
            </label>

            <label>
              <span>Referentie</span>

              <input
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          <div className={styles.paymentActions}>
            <button
              className="button button-secondary"
              type="button"
              onClick={() =>
                setShowPayment(false)
              }
            >
              Annuleren
            </button>

            <button
              className="button button-primary"
              type="button"
              onClick={handlePayment}
            >
              Betaling opslaan
            </button>
          </div>
        </section>
      )}

      <section className={styles.metricGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Factuurbedrag
          </div>

          <div className="metric-value">
            {formatCurrency(invoice.total)}
          </div>

          <div className="metric-detail">
            inclusief btw
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Betaald
          </div>

          <div className="metric-value">
            {formatCurrency(paidAmount)}
          </div>

          <div className="metric-detail">
            geregistreerde betalingen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Openstaand
          </div>

          <div className="metric-value">
            {formatCurrency(outstandingAmount)}
          </div>

          <div className="metric-detail">
            nog te ontvangen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Vervaldatum
          </div>

          <div className="metric-value">
            {formatDate(invoice.dueDate)}
          </div>

          <div className="metric-detail">
            {invoice.paymentDays} dagen
          </div>
        </article>
      </section>

      <section className={styles.overviewGrid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Factuurgegevens
              </h2>
            </div>

            <StatusBadge
              label={invoice.status}
              tone={
                invoice.status === "Betaald"
                  ? "success"
                  : invoice.status ===
                      "Vervallen"
                    ? "danger"
                    : invoice.status ===
                        "Deels betaald"
                      ? "warning"
                      : invoice.status ===
                            "Definitief" ||
                          invoice.status ===
                            "Verzonden"
                        ? "info"
                        : "neutral"
              }
            />
          </div>

          <dl className={styles.detailList}>
            <div>
              <dt>Factuurnummer</dt>
              <dd>{invoice.invoiceNumber}</dd>
            </div>

            <div>
              <dt>Verkooporder</dt>
              <dd>{invoice.salesOrderNumber}</dd>
            </div>

            <div>
              <dt>Factuurdatum</dt>
              <dd>
                {formatDate(invoice.invoiceDate)}
              </dd>
            </div>

            <div>
              <dt>Vervaldatum</dt>
              <dd>
                {formatDate(invoice.dueDate)}
              </dd>
            </div>

            <div>
              <dt>Verzonden op</dt>
              <dd>
                {invoice.sentAt
                  ? new Intl.DateTimeFormat(
                      "nl-NL",
                    ).format(
                      new Date(invoice.sentAt),
                    )
                  : "—"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Klantgegevens
              </h2>
            </div>
          </div>

          <dl className={styles.detailList}>
            <div>
              <dt>Klantnummer</dt>
              <dd>{invoice.customerNumber}</dd>
            </div>

            <div>
              <dt>Klant</dt>
              <dd>{invoice.customerName}</dd>
            </div>

            <div>
              <dt>Contactpersoon</dt>
              <dd>
                {invoice.contactPerson || "—"}
              </dd>
            </div>

            <div>
              <dt>E-mailadres</dt>
              <dd>{invoice.email || "—"}</dd>
            </div>

            <div>
              <dt>Plaats</dt>
              <dd>{invoice.city || "—"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Factuurregels
            </h2>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikelnummer</th>
                <th>Artikel</th>
                <th>Kleur</th>

                {invoiceSizes.map(
                  (size) => (
                    <th
                      key={size}
                      className="table-number"
                    >
                      {size}
                    </th>
                  ),
                )}

                <th className="table-number">
                  Totaal
                </th>

                <th className="table-number">
                  Prijs
                </th>

                <th className="table-number">
                  Bedrag
                </th>
              </tr>
            </thead>

            <tbody>
              {articleBlocks.map((block) => (
                <tr key={`${block.productCode}-${block.color}`}>
                  <td>
                    {block.productCode || "—"}
                  </td>

                  <td className="table-primary">
                    {block.productName}
                  </td>

                  <td>
                    {block.color || "—"}
                  </td>

                  {invoiceSizes.map((size) => (
                    <td
                      key={size}
                      className="table-number"
                    >
                      {block.quantities[size] || ""}
                    </td>
                  ))}

                  <td className="table-number">
                    {block.total}
                  </td>

                  <td className="table-number">
                    {formatCurrency(
                      block.unitPrice,
                    )}
                  </td>

                  <td className="table-number table-primary">
                    {formatCurrency(
                      block.lineTotal,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.totals}>
          <dl>
            <div>
              <dt>Bruto subtotaal</dt>
              <dd>
                {formatCurrency(
                  invoice.subtotalBeforeDiscount,
                )}
              </dd>
            </div>

            <div>
              <dt>Korting</dt>
              <dd>
                -{" "}
                {formatCurrency(
                  invoice.discountAmount,
                )}
              </dd>
            </div>

            <div>
              <dt>Subtotaal</dt>
              <dd>
                {formatCurrency(invoice.subtotal)}
              </dd>
            </div>

            <div>
              <dt>Btw {invoice.vatRate}%</dt>
              <dd>
                {formatCurrency(
                  invoice.vatAmount,
                )}
              </dd>
            </div>

            <div className={styles.totalLine}>
              <dt>Totaal</dt>
              <dd>
                {formatCurrency(invoice.total)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {invoice.payments.length > 0 && (
        <section
          className={`content-card ${styles.paymentsSection}`}
        >
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Betalingen
              </h2>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Methode</th>
                  <th>Referentie</th>
                  <th className="table-number">
                    Bedrag
                  </th>
                </tr>
              </thead>

              <tbody>
                {invoice.payments.map(
                  (payment) => (
                    <tr key={payment.id}>
                      <td>
                        {formatDate(
                          payment.paymentDate,
                        )}
                      </td>

                      <td>{payment.method}</td>

                      <td>
                        {payment.reference || "—"}
                      </td>

                      <td className="table-number table-primary">
                        {formatCurrency(
                          payment.amount,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {invoice.status !== "Verzonden" &&
 invoice.status !== "Betaald" &&
 invoice.status !== "Deels betaald" &&
 invoice.status !== "Gecrediteerd" && (
        <section className={styles.dangerZone}>
          <div>
            <h2>Factuur verwijderen</h2>

            <p>
              Verzonden of betaalde facturen kunnen later alleen via
              een creditfactuur worden gecorrigeerd.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
          >
            Factuur verwijderen
          </button>
        </section>
      )}
    </div>
  );
}