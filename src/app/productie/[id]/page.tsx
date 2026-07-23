"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  cancelProductionOrder,
  getProductionOrderById,
  getProductionOrderTotals,
  receiveProductionOrder,
  updateProductionStatus,
  type ProductionOrder,
  type ProductionOrderStatus,
} from "@/lib/production";
import {
  getWarehouseLocations,
} from "@/lib/warehouse";
import styles from "./production-detail.module.css";

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

export default function ProductionDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] =
    useState<ProductionOrder | null>(null);
  const [locationId, setLocationId] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  const locations =
    getWarehouseLocations().filter(
      (location) =>
        location.active &&
        ["Ontvangst", "Bulk", "Pick"].includes(
          location.type,
        ),
    );

  function reload() {
    setOrder(
      getProductionOrderById(params.id),
    );
  }

  useEffect(() => {
    reload();
    setLocationId(locations[0]?.id || "");
  }, [params.id]);

  if (!order) {
    return (
      <section className="content-card">
        <div className={styles.empty}>
          Productieorder niet gevonden.
        </div>
      </section>
    );
  }

  const totals =
    getProductionOrderTotals(order);

  function execute(
    action: () => ProductionOrder | null,
    successMessage: string,
  ) {
    try {
      const updated = action();

      if (updated) {
        setOrder(updated);
      }

      setMessage(successMessage);
      setError("");
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
      <div className={styles.breadcrumb}>
        <Link href="/productie">
          Productie
        </Link>
        <span>›</span>
        <span>{order.productionNumber}</span>
      </div>

      <PageHeader
        eyebrow="Productieorder"
        title={order.productionNumber}
        description={`${order.supplierName} · ${order.collectionCode}`}
        action={
          <div className="button-group">
            {order.status !== "Ontvangen" &&
              order.status !==
                "Geannuleerd" && (
                <select
                  className={styles.statusSelect}
                  value={order.status}
                  onChange={(event) =>
                    execute(
                      () =>
                        updateProductionStatus(
                          order.id,
                          event.target
                            .value as ProductionOrderStatus,
                        ),
                      "Status bijgewerkt.",
                    )
                  }
                >
                  <option>Concept</option>
                  <option>Besteld</option>
                  <option>In productie</option>
                  <option>Verzonden</option>
                </select>
              )}

            {order.status !== "Ontvangen" &&
              order.status !==
                "Geannuleerd" && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() =>
                    execute(
                      () =>
                        receiveProductionOrder({
                          productionOrderId:
                            order.id,
                          warehouseLocationId:
                            locationId,
                        }),
                      "Productie ontvangen en voorraad bijgewerkt.",
                    )
                  }
                >
                  Productie ontvangen
                </button>
              )}

            {order.status !== "Ontvangen" &&
              order.status !==
                "Geannuleerd" && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    execute(
                      () =>
                        cancelProductionOrder(
                          order.id,
                        ),
                      "Productieorder geannuleerd.",
                    )
                  }
                >
                  Annuleren
                </button>
              )}
          </div>
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
            Status
          </div>
          <div className={styles.statusValue}>
            <StatusBadge
              label={order.status}
              tone={
                order.status === "Ontvangen"
                  ? "success"
                  : order.status ===
                      "Geannuleerd"
                    ? "danger"
                    : "info"
              }
            />
          </div>
          <div className="metric-detail">
            {order.supplierReference ||
              "Geen referentie"}
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Aantal
          </div>
          <div className="metric-value">
            {totals.orderedQuantity}
          </div>
          <div className="metric-detail">
            stuks
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Waarde
          </div>
          <div className="metric-value">
            {money(totals.value)}
          </div>
          <div className="metric-detail">
            exclusief btw
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Leverdatum
          </div>
          <div className={styles.dateValue}>
            {date(order.expectedDeliveryDate)}
          </div>
          <div className="metric-detail">
            werkelijk:{" "}
            {date(order.actualDeliveryDate)}
          </div>
        </article>
      </section>

      {order.status !== "Ontvangen" &&
        order.status !== "Geannuleerd" && (
          <section className={styles.receivePanel}>
            <div>
              <strong>
                Ontvangstlocatie
              </strong>
              <span>
                Bij ontvangst wordt alle resterende
                productie op deze locatie geboekt.
              </span>
            </div>

            <select
              value={locationId}
              onChange={(event) =>
                setLocationId(event.target.value)
              }
            >
              {locations.map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.code} ·{" "}
                  {location.name}
                </option>
              ))}
            </select>
          </section>
        )}

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>SKU</th>
                <th>Kleur</th>
                <th>Maat</th>
                <th className="table-number">
                  Aantal
                </th>
                <th className="table-number">
                  Ontvangen
                </th>
                <th className="table-number">
                  Inkoopprijs
                </th>
              </tr>
            </thead>

            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td className="table-primary">
                    {line.productCode} ·{" "}
                    {line.productName}
                  </td>
                  <td>{line.sku}</td>
                  <td>{line.color}</td>
                  <td>{line.size}</td>
                  <td className="table-number">
                    {line.orderedQuantity}
                  </td>
                  <td className="table-number">
                    {line.receivedQuantity}
                  </td>
                  <td className="table-number">
                    {money(line.purchasePrice)}
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
