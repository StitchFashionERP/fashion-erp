"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  getInvoiceById,
  type Invoice,
} from "@/lib/invoices";
import styles from "./invoice-print.module.css";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL").format(
    new Date(`${value}T12:00:00`),
  );
}

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();

  const [invoice, setInvoice] =
    useState<Invoice | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInvoice(getInvoiceById(params.id));
    setLoaded(true);
  }, [params.id]);

  if (!loaded) {
    return <div>Factuur laden...</div>;
  }

  if (!invoice) {
    return (
      <div>
        <h1>Factuur niet gevonden</h1>

        <Link href="/facturen">
          Terug naar facturen
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.screenActions}>
        <Link
          href={`/facturen/${invoice.id}`}
          className="button button-secondary"
        >
          Terug naar factuur
        </Link>

        <button
          className="button button-primary"
          type="button"
          onClick={() => window.print()}
        >
          Factuur printen
        </button>
      </div>

      <article className={styles.document}>
        <header className={styles.header}>
          <div>
            <div className={styles.logo}>
              Fashion ERP
            </div>

            <p>
              Demo Fashion B.V.
              <br />
              Amsterdam
              <br />
              Nederland
              <br />
              BTW: NL000000000B01
              <br />
              IBAN: NL00 BANK 0000 0000 00
            </p>
          </div>

          <div className={styles.documentTitle}>
            <h1>Factuur</h1>
            <strong>
              {invoice.invoiceNumber}
            </strong>
          </div>
        </header>

        <section className={styles.addressGrid}>
          <div>
            <h2>Factuur aan</h2>

            <p>
              <strong>
                {invoice.customerName}
              </strong>
              <br />
              {invoice.contactPerson}
              <br />
              {invoice.city}
              <br />
              {invoice.email}
            </p>
          </div>

          <dl>
            <div>
              <dt>Factuurdatum</dt>
              <dd>
                {formatDate(
                  invoice.invoiceDate,
                )}
              </dd>
            </div>

            <div>
              <dt>Vervaldatum</dt>
              <dd>
                {formatDate(invoice.dueDate)}
              </dd>
            </div>

            <div>
              <dt>Verkooporder</dt>
              <dd>
                {invoice.salesOrderNumber}
              </dd>
            </div>

            <div>
              <dt>Klantnummer</dt>
              <dd>
                {invoice.customerNumber}
              </dd>
            </div>
          </dl>
        </section>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Artikel</th>
              <th>SKU</th>
              <th>Aantal</th>
              <th>Prijs</th>
              <th>Korting</th>
              <th>Bedrag</th>
            </tr>
          </thead>

          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <strong>
                    {line.productName}
                  </strong>
                  <br />
                  <span>
                    {line.color} · {line.size}
                  </span>
                </td>

                <td>{line.sku}</td>
                <td>{line.quantity}</td>

                <td>
                  {formatCurrency(
                    line.unitPrice,
                  )}
                </td>

                <td>
                  {line.discountPercentage.toLocaleString(
                    "nl-NL",
                  )}
                  %
                </td>

                <td>
                  {formatCurrency(
                    line.lineSubtotal,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className={styles.totals}>
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
                {formatCurrency(
                  invoice.subtotal,
                )}
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
        </section>

        <footer className={styles.footer}>
          <p>
            Gelieve het factuurbedrag vóór{" "}
            <strong>
              {formatDate(invoice.dueDate)}
            </strong>{" "}
            over te maken onder vermelding van{" "}
            <strong>
              {invoice.invoiceNumber}
            </strong>
            .
          </p>

          {invoice.notes && (
            <p>Notitie: {invoice.notes}</p>
          )}
        </footer>
      </article>
    </div>
  );
}
