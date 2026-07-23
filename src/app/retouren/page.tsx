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
  getCustomerReturns,
  getReturnsDashboard,
  type CustomerReturn,
  type ReturnStatus,
} from "@/lib/returns";

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

function getStatusTone(
  status: ReturnStatus,
): StatusTone {
  if (
    status === "Afgerond" ||
    status === "Gecrediteerd"
  ) {
    return "success";
  }

  if (
    status === "Ontvangen" ||
    status === "Gecontroleerd"
  ) {
    return "warning";
  }

  if (status === "Aangemeld") {
    return "info";
  }

  return "neutral";
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<
    CustomerReturn[]
  >([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setReturns(getCustomerReturns());
    setLoaded(true);
  }, []);

  const dashboard = useMemo(
    () => getReturnsDashboard(),
    [returns],
  );

  const filteredReturns = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return returns;
    }

    return returns.filter((item) =>
      [
        item.rmaNumber,
        item.customerName,
        item.invoiceNumber,
        item.salesOrderNumber,
        item.status,
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [returns, search]);

  if (!loaded) {
    return null;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Verkoop"
        title="Retouren"
        description="Beheer retouraanmeldingen, controles en creditfacturen."
        action={
          <Link
            href="/retouren/nieuw"
            className="button button-primary"
          >
            <span className="button-plus">+</span>
            Nieuwe retour
          </Link>
        }
      />

      <section className="article-summary-grid">
        <article className="metric-card">
          <div className="metric-label">
            Totaal retouren
          </div>
          <div className="metric-value">
            {dashboard.totalReturns}
          </div>
          <div className="metric-detail">
            alle statussen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Te ontvangen
          </div>
          <div className="metric-value">
            {dashboard.awaitingReceipt}
          </div>
          <div className="metric-detail">
            aangemelde retouren
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Te controleren
          </div>
          <div className="metric-value">
            {dashboard.awaitingInspection}
          </div>
          <div className="metric-detail">
            ontvangen retouren
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Te crediteren
          </div>
          <div className="metric-value">
            {dashboard.awaitingCredit}
          </div>
          <div className="metric-detail">
            gecontroleerde retouren
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Retouroverzicht
            </h2>
            <p className="content-card-description">
              Zoek op retournummer, klant, factuur,
              verkooporder of status.
            </p>
          </div>

          <input
            type="search"
            value={search}
            placeholder="Zoeken..."
            aria-label="Retouren zoeken"
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Retournummer</th>
                <th>Klant</th>
                <th>Factuur</th>
                <th>Verkooporder</th>
                <th className="table-number">
                  Regels
                </th>
                <th className="table-number">
                  Aantal
                </th>
                <th>Status</th>
                <th>Aangemaakt</th>
              </tr>
            </thead>

            <tbody>
              {filteredReturns.map((item) => {
                const quantity = item.lines.reduce(
                  (total, line) =>
                    total + line.returnQuantity,
                  0,
                );

                return (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/retouren/${item.id}`}
                        className="table-link"
                      >
                        {item.rmaNumber}
                      </Link>
                    </td>

                    <td className="table-primary">
                      {item.customerName}
                    </td>

                    <td>{item.invoiceNumber || "—"}</td>

                    <td>
                      {item.salesOrderNumber || "—"}
                    </td>

                    <td className="table-number">
                      {item.lines.length}
                    </td>

                    <td className="table-number">
                      {quantity}
                    </td>

                    <td>
                      <StatusBadge
                        label={item.status}
                        tone={getStatusTone(
                          item.status,
                        )}
                      />
                    </td>

                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredReturns.length === 0 && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
            }}
          >
            {returns.length === 0
              ? "Nog geen retouren."
              : "Geen retouren gevonden."}
          </div>
        )}
      </section>
    </div>
  );
}
