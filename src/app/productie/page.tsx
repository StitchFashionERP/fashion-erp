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
  getProductionDashboard,
  getProductionOrders,
  getProductionOrderTotals,
  isProductionOrderOverdue,
  type ProductionOrder,
  type ProductionOrderStatus,
} from "@/lib/production";
import styles from "./production.module.css";

const statuses: Array<
  ProductionOrderStatus | "Alle statussen"
> = [
  "Alle statussen",
  "Concept",
  "Besteld",
  "In productie",
  "Verzonden",
  "Ontvangen",
  "Geannuleerd",
];

function date(value: string) {
  return value
    ? new Intl.DateTimeFormat("nl-NL").format(
        new Date(`${value}T12:00:00`),
      )
    : "—";
}

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function tone(status: ProductionOrderStatus) {
  if (status === "Ontvangen") {
    return "success" as const;
  }

  if (
    status === "In productie" ||
    status === "Verzonden"
  ) {
    return "info" as const;
  }

  if (status === "Geannuleerd") {
    return "danger" as const;
  }

  if (status === "Besteld") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<
    ProductionOrder[]
  >([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    ProductionOrderStatus | "Alle statussen"
  >("Alle statussen");
  const [overdueOnly, setOverdueOnly] =
    useState(false);

  useEffect(() => {
    setOrders(getProductionOrders());
  }, []);

  const dashboard = useMemo(
    () => getProductionDashboard(),
    [orders],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (
        status !== "Alle statussen" &&
        order.status !== status
      ) {
        return false;
      }

      if (
        overdueOnly &&
        !isProductionOrderOverdue(order)
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        order.productionNumber,
        order.supplierName,
        order.supplierReference,
        order.collectionCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [orders, search, status, overdueOnly]);

  return (
    <div>
      <PageHeader
        eyebrow="Inkoop"
        title="Productie"
        description="Plan eenvoudige productieorders en boek ontvangen productie direct op voorraad."
        action={
          <Link
            href="/productie/nieuw"
            className="button button-primary"
          >
            + Nieuwe productieorder
          </Link>
        }
      />

      <section className={styles.metricGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Open productie
          </div>
          <div className="metric-value">
            {dashboard.open}
          </div>
          <div className="metric-detail">
            actieve orders
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            In productie
          </div>
          <div className="metric-value">
            {dashboard.inProduction}
          </div>
          <div className="metric-detail">
            bij leveranciers
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Onderweg
          </div>
          <div className="metric-value">
            {dashboard.inTransit}
          </div>
          <div className="metric-detail">
            verzonden
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Te laat
          </div>
          <div className="metric-value">
            {dashboard.overdue}
          </div>
          <div className="metric-detail">
            geplande leverdatum verstreken
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
              placeholder="Zoek productieorder, leverancier of collectie..."
            />
          </div>

          <div className={styles.filters}>
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as ProductionOrderStatus | "Alle statussen",
                )
              }
            >
              {statuses.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
            </select>

            <label>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(event) =>
                  setOverdueOnly(
                    event.target.checked,
                  )
                }
              />
              Alleen te laat
            </label>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Productieorder</th>
                <th>Leverancier</th>
                <th>Collectie</th>
                <th>Geplande levering</th>
                <th>Status</th>
                <th className="table-number">
                  Stuks
                </th>
                <th className="table-number">
                  Waarde
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((order) => {
                const totals =
                  getProductionOrderTotals(order);

                const late =
                  isProductionOrderOverdue(order);

                return (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/productie/${order.id}`}
                        className="table-link"
                      >
                        {order.productionNumber}
                      </Link>
                      <div className={styles.meta}>
                        {order.supplierReference ||
                          "Geen referentie"}
                      </div>
                    </td>

                    <td className="table-primary">
                      {order.supplierName}
                    </td>

                    <td>{order.collectionCode}</td>

                    <td
                      className={
                        late ? styles.overdue : ""
                      }
                    >
                      {date(
                        order.expectedDeliveryDate,
                      )}
                      {late && (
                        <div className={styles.meta}>
                          Te laat
                        </div>
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        label={order.status}
                        tone={tone(order.status)}
                      />
                    </td>

                    <td className="table-number">
                      {totals.orderedQuantity}
                    </td>

                    <td className="table-number table-primary">
                      {money(totals.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            Geen productieorders gevonden.
          </div>
        )}
      </section>
    </div>
  );
}
