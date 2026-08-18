"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getInvoiceOutstandingAmount,
  getInvoices,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/invoice-api";

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

function getTone(
  status: InvoiceStatus,
): StatusTone {
  if (status === "Betaald") {
    return "success";
  }

  if (status === "Deels betaald") {
    return "warning";
  }

  if (status === "Vervallen") {
    return "danger";
  }

  if (
    status === "Definitief" ||
    status === "Verzonden"
  ) {
    return "info";
  }

  return "neutral";
}

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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<
    Invoice[]
  >([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    "Alle statussen",
  );

  useEffect(() => {
    async function loadInvoices() {
      const data = await getInvoices();
      setInvoices(data);
    }

    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        !query ||
        invoice.invoiceNumber
          .toLowerCase()
          .includes(query) ||
        invoice.salesOrderNumber
          .toLowerCase()
          .includes(query) ||
        invoice.customerName
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "Alle statussen" ||
        invoice.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, status]);

  const totalOutstanding = invoices.reduce(
    (total, invoice) =>
      total +
      getInvoiceOutstandingAmount(invoice),
    0,
  );

  const overdueInvoices = invoices.filter(
    (invoice) => invoice.status === "Vervallen",
  );

  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "Betaald",
  );

  return (
    <div>
      <PageHeader
        eyebrow="Financieel"
        title="Facturen"
        description="Maak, verstuur en volg verkoopfacturen en betalingen."
        action={
          <Link
            href="/facturen/nieuw"
            className="button button-primary"
          >
            <span className="button-plus">+</span>
            Nieuwe factuur
          </Link>
        }
      />

      <section className="article-summary-grid">
        <article className="metric-card">
          <div className="metric-label">
            Openstaand
          </div>

          <div className="metric-value">
            {formatCurrency(totalOutstanding)}
          </div>

          <div className="metric-detail">
            nog te ontvangen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Vervallen facturen
          </div>

          <div className="metric-value">
            {overdueInvoices.length}
          </div>

          <div className="metric-detail">
            betaaltermijn verstreken
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Betaalde facturen
          </div>

          <div className="metric-value">
            {paidInvoices.length}
          </div>

          <div className="metric-detail">
            volledig voldaan
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-toolbar article-toolbar">
          <div className="table-search">
            <span>⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Zoek op factuur, order of klant..."
            />
          </div>

          <div className="article-filters">
            <select
              className="article-filter-select"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              <option>Alle statussen</option>
              <option>Concept</option>
              <option>Definitief</option>
              <option>Verzonden</option>
              <option>Deels betaald</option>
              <option>Betaald</option>
              <option>Vervallen</option>
              <option>Gecrediteerd</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Factuurnummer</th>
                <th>Klant</th>
                <th>Verkooporder</th>
                <th>Factuurdatum</th>
                <th>Vervaldatum</th>
                <th className="table-number">
                  Totaal
                </th>
                <th className="table-number">
                  Openstaand
                </th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link
                      href={`/facturen/${invoice.id}`}
                      className="table-link"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>

                  <td className="table-primary">
                    {invoice.customerName}
                  </td>

                  <td>{invoice.salesOrderNumber}</td>

                  <td>
                    {formatDate(invoice.invoiceDate)}
                  </td>

                  <td>
                    {formatDate(invoice.dueDate)}
                  </td>

                  <td className="table-number table-primary">
                    {formatCurrency(invoice.total)}
                  </td>

                  <td className="table-number">
                    {formatCurrency(
                      getInvoiceOutstandingAmount(
                        invoice,
                      ),
                    )}
                  </td>

                  <td>
                    <StatusBadge
                      label={invoice.status}
                      tone={getTone(invoice.status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="article-empty-state">
            <h2>Geen facturen gevonden</h2>

            <p>
              Maak een factuur vanuit een verzonden
              verkooporder.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
