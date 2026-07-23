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
  getSalesOrders,
  getSalesOrderTotals,
  type SalesOrder,
  type SalesOrderStatus,
} from "@/lib/sales";

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

function getTone(
  status: SalesOrderStatus,
): StatusTone {
  if (status === "Verzonden") {
    return "success";
  }

  if (status === "Gereed") {
    return "success";
  }

  if (status === "Gereserveerd") {
    return "info";
  }

  if (status === "Geannuleerd") {
    return "danger";
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
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL").format(
    new Date(`${value}T12:00:00`),
  );
}

export default function SalesPage() {
  const [orders, setOrders] = useState<
    SalesOrder[]
  >([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setOrders(getSalesOrders());
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter(
      (order) =>
        !query ||
        order.orderNumber
          .toLowerCase()
          .includes(query) ||
        order.customerName
          .toLowerCase()
          .includes(query) ||
        order.customerNumber
          .toLowerCase()
          .includes(query),
    );
  }, [orders, search]);

  const openOrders = orders.filter(
    (order) =>
      order.status !== "Verzonden" &&
      order.status !== "Geannuleerd",
  );

  const openValue = openOrders.reduce(
    (total, order) =>
      total + getSalesOrderTotals(order).subtotal,
    0,
  );

  const totalUnits = openOrders.reduce(
    (total, order) =>
      total + getSalesOrderTotals(order).quantity,
    0,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Verkoop"
        title="Verkooporders"
        description="Beheer wholesale-orders, reserveringen, pakbonnen en verzendingen."
        action={
          <Link
            href="/verkoop/nieuw"
            className="button button-primary"
          >
            <span className="button-plus">+</span>
            Nieuwe verkooporder
          </Link>
        }
      />

      <section className="article-summary-grid">
        <article className="metric-card">
          <div className="metric-label">
            Totaal verkooporders
          </div>
          <div className="metric-value">
            {orders.length}
          </div>
          <div className="metric-detail">
            alle statussen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Openstaande orders
          </div>
          <div className="metric-value">
            {openOrders.length}
          </div>
          <div className="metric-detail">
            nog niet verzonden
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Openstaande orderwaarde
          </div>
          <div className="metric-value">
            {formatCurrency(openValue)}
          </div>
          <div className="metric-detail">
            exclusief btw
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Te leveren
          </div>
          <div className="metric-value">
            {totalUnits}
          </div>
          <div className="metric-detail">
            stuks in open orders
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-toolbar">
          <div className="table-search">
            <span>⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Zoek op ordernummer of klant..."
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ordernummer</th>
                <th>Klant</th>
                <th>Orderdatum</th>
                <th>Gewenste levering</th>
                <th className="table-number">
                  Regels
                </th>
                <th className="table-number">
                  Aantal
                </th>
                <th className="table-number">
                  Bedrag
                </th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const totals =
                  getSalesOrderTotals(order);

                return (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/verkoop/${order.id}`}
                        className="table-link"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>

                    <td className="table-primary">
                      {order.customerName}
                    </td>

                    <td>
                      {formatDate(order.orderDate)}
                    </td>

                    <td>
                      {formatDate(
                        order.requestedDeliveryDate,
                      )}
                    </td>

                    <td className="table-number">
                      {order.lines.length}
                    </td>

                    <td className="table-number">
                      {totals.quantity}
                    </td>

                    <td className="table-number table-primary">
                      {formatCurrency(
                        totals.subtotal,
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        label={order.status}
                        tone={getTone(order.status)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="article-empty-state">
            <h2>Geen verkooporders gevonden</h2>
            <p>
              Maak je eerste verkooporder aan.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
