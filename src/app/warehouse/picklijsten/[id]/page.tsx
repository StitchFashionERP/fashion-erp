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
  getPickListById,
  getWarehouseLocations,
  markPickListPacked,
  markPickListShipped,
  pickWarehouseLine,
  startPickList,
  type PickList,
} from "@/lib/warehouse";
import styles from "./pick-list-detail.module.css";

export default function PickListDetailPage() {
  const params = useParams<{ id: string }>();
  const [list, setList] =
    useState<PickList | null>(null);
  const [error, setError] = useState("");
  const [notification, setNotification] =
    useState("");

  function reload() {
    setList(getPickListById(params.id));
  }

  useEffect(() => {
    reload();
  }, [params.id]);

  if (!list) {
    return (
      <section className="content-card">
        <div className={styles.notFound}>
          Picklijst niet gevonden.
        </div>
      </section>
    );
  }

  const required = list.lines.reduce(
    (total, line) =>
      total + line.requiredQuantity,
    0,
  );

  const picked = list.lines.reduce(
    (total, line) =>
      total + line.pickedQuantity,
    0,
  );

  const locations = getWarehouseLocations();

  function execute(
    action: () => PickList | null,
    message: string,
  ) {
    try {
      const updated = action();

      if (updated) {
        setList(updated);
      }

      setError("");
      setNotification(message);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Actie mislukt.",
      );
    }
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/warehouse/picklijsten">
          Picklijsten
        </Link>
        <span>›</span>
        <span>{list.pickNumber}</span>
      </div>

      <PageHeader
        eyebrow="Warehouse pick"
        title={list.pickNumber}
        description={`${list.salesOrderNumber} · ${list.customerName}`}
        action={
          <div className="button-group">
            {list.status === "Open" && (
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  execute(
                    () =>
                      startPickList(
                        list.id,
                        "Daan",
                      ),
                    "Picken gestart.",
                  )
                }
              >
                Start picken
              </button>
            )}

            {list.status === "Gepickt" && (
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  execute(
                    () =>
                      markPickListPacked(
                        list.id,
                      ),
                    "Order is verpakt.",
                  )
                }
              >
                Markeer als verpakt
              </button>
            )}

            {list.status === "Verpakt" && (
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  execute(
                    () =>
                      markPickListShipped(
                        list.id,
                      ),
                    "Order is verzonden.",
                  )
                }
              >
                Verzenden
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

      {notification && (
        <div className={styles.notification}>
          ✓ {notification}
        </div>
      )}

      <section className={styles.metricGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Status
          </div>
          <div className={styles.statusValue}>
            <StatusBadge
              label={list.status}
              tone={
                list.status === "Verzonden"
                  ? "success"
                  : list.status === "Bezig"
                    ? "warning"
                    : "info"
              }
            />
          </div>
          <div className="metric-detail">
            {list.assignedTo || "Niet toegewezen"}
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Gepickt
          </div>
          <div className="metric-value">
            {picked}
          </div>
          <div className="metric-detail">
            van {required} stuks
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Orderregels
          </div>
          <div className="metric-value">
            {list.lines.length}
          </div>
          <div className="metric-detail">
            varianten
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Voortgang
          </div>
          <div className="metric-value">
            {required > 0
              ? Math.round(
                  (picked / required) * 100,
                )
              : 100}
            %
          </div>
          <div className="metric-detail">
            pickcompleetheid
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Pickregels
            </h2>
            <p className="content-card-description">
              Pick per locatie of gebruik de
              scannerpagina.
            </p>
          </div>

          <Link
            href={`/warehouse/scanner?pickListId=${list.id}`}
            className="button button-secondary"
          >
            Scanner openen
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Locatie</th>
                <th>Artikel</th>
                <th>Variant</th>
                <th className="table-number">
                  Nodig
                </th>
                <th className="table-number">
                  Gepickt
                </th>
                <th />
              </tr>
            </thead>

            <tbody>
              {list.lines.map((line) => {
                const location =
                  locations.find(
                    (item) =>
                      item.id ===
                      line.locationId,
                  );

                const remaining =
                  line.requiredQuantity -
                  line.pickedQuantity;

                return (
                  <tr key={line.id}>
                    <td className="table-primary">
                      {location?.code || "—"}
                    </td>
                    <td>
                      {line.productName}
                      <div className={styles.meta}>
                        {line.sku}
                      </div>
                    </td>
                    <td>
                      {line.color} · {line.size}
                    </td>
                    <td className="table-number">
                      {line.requiredQuantity}
                    </td>
                    <td className="table-number">
                      {line.pickedQuantity}
                    </td>
                    <td className="table-number">
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={
                          remaining <= 0 ||
                          list.status === "Open"
                        }
                        onClick={() =>
                          execute(
                            () =>
                              pickWarehouseLine({
                                pickListId:
                                  list.id,
                                lineId: line.id,
                                quantity:
                                  remaining,
                              }),
                            `${line.sku} volledig gepickt.`,
                          )
                        }
                      >
                        {remaining <= 0
                          ? "Gereed"
                          : `Pick ${remaining}`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
