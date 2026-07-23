"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { DocumentActionButtons } from "@/components/documents/document-action-buttons";
import {
  allocateSalesOrderStock,
  cancelSalesOrder,
  confirmSalesOrder,
  deleteSalesOrder,
  getSalesOrderAvailability,
  getSalesOrderById,
  getSalesOrderTotals,
  markSalesOrderReady,
  shipSalesOrder,
  type SalesOrder,
} from "@/lib/sales";
import styles from "./sales-order-detail.module.css";

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

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] =
    useState<SalesOrder | null>(null);
  const [loaded, setLoaded] =
    useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] =
    useState("");

  useEffect(() => {
    setOrder(getSalesOrderById(params.id));
    setLoaded(true);
  }, [params.id]);


  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeout = window.setTimeout(
      () => setNotification(""),
      3200,
    );

    return () =>
      window.clearTimeout(timeout);
  }, [notification]);

  const totals = useMemo(
    () =>
      order
        ? getSalesOrderTotals(order)
        : null,
    [order],
  );

  const availability = useMemo(
    () =>
      order
        ? getSalesOrderAvailability(order)
        : null,
    [order],
  );

  if (!loaded) {
    return (
      <section className="content-card">
        <div className={styles.loading}>
          Verkooporder laden...
        </div>
      </section>
    );
  }

  if (!order || !totals || !availability) {
    return (
      <section className="content-card">
        <div className={styles.notFound}>
          <h1>
            Verkooporder niet gevonden
          </h1>

          <Link
            href="/verkoop"
            className="button button-primary"
          >
            Terug naar verkoop
          </Link>
        </div>
      </section>
    );
  }

  function execute(
    action: () => SalesOrder,
    successMessage?: string,
  ) {
    setError("");

    try {
      const updated = action();
      setOrder(updated);

      if (successMessage) {
        setNotification(successMessage);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De actie kon niet worden uitgevoerd.",
      );
    }
  }

  function handleDelete() {
    if (!order) {
      setError("Verkooporder niet gevonden.");
      return;
    }

    if (
      !window.confirm(
        "Weet je zeker dat je deze conceptorder wilt verwijderen?",
      )
    ) {
      return;
    }

    try {
      deleteSalesOrder(order.id);
      router.push("/verkoop");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De order kon niet worden verwijderd.",
      );
    }
  }

  function handleCancel() {
    if (!order) {
      setError("Verkooporder niet gevonden.");
      return;
    }

    if (
      !window.confirm(
        "Weet je zeker dat je deze order wilt annuleren?",
      )
    ) {
      return;
    }

    execute(
      () => cancelSalesOrder(order.id),
      "De verkooporder is geannuleerd.",
    );
  }

  function handleAllocate() {
    if (!order) {
      setError("Verkooporder niet gevonden.");
      return;
    }

    execute(
      () =>
        allocateSalesOrderStock(order.id),
      "De beschikbare voorraad is opnieuw over de order verdeeld.",
    );
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/verkoop">
          Verkooporders
        </Link>
        <span>›</span>
        <span>{order.orderNumber}</span>
      </div>

      {notification && (
        <div className={styles.error}>
          {notification}
        </div>
      )}

      <PageHeader
        eyebrow="Verkooporder"
        title={order.orderNumber}
        description={`${order.customerName} · ${
          order.city || "Geen plaats"
        }`}
        action={
          <div className="button-group">
            <DocumentActionButtons
              referenceId={order.id}
              documentType="SALES_ORDER_CONFIRMATION"
              printLabel="Orderbevestiging PDF"
              emailLabel="Orderbevestiging mailen"
              onSent={() => {
                if (
                  order.status === "Concept"
                ) {
                  execute(
                    () =>
                      confirmSalesOrder(
                        order.id,
                      ),
                    "De orderbevestiging is verstuurd en de order is bevestigd.",
                  );
                } else {
                  setNotification(
                    "De orderbevestiging is verstuurd.",
                  );
                }
              }}
            />


            <DocumentActionButtons
              referenceId={order.id}
              documentType="PACKING_SLIP"
              printLabel="Pakbon PDF"
              emailLabel="Pakbon mailen"
              onSent={() =>
                setNotification(
                  "De pakbon is verstuurd.",
                )
              }
            />

            {order.status === "Concept" && (
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  execute(
                    () =>
                      confirmSalesOrder(
                        order.id,
                      ),
                    "De verkooporder is bevestigd. Voorraad is nog niet verplicht.",
                  )
                }
              >
                Order bevestigen
              </button>
            )}

            {order.status === "Bevestigd" && (
              <button
                className="button button-primary"
                type="button"
                onClick={handleAllocate}
              >
                Voorraad alloceren
              </button>
            )}

            {order.status ===
              "Gereserveerd" && (
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  execute(
                    () =>
                      markSalesOrderReady(
                        order.id,
                      ),
                    "De verkooporder is gereedgemeld.",
                  )
                }
              >
                Gereedmelden
              </button>
            )}

            {order.status === "Gereed" && (
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  execute(
                    () =>
                      shipSalesOrder(
                        order.id,
                      ),
                    "De verkooporder is verzonden.",
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

      {order.status === "Bevestigd" &&
        availability.backorderQuantity >
          0 && (
          <section className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Voororder / backorder
                </h2>

                <p className="content-card-description">
                  Deze order is bevestigd, maar
                  nog niet volledig op voorraad.
                  De orderbevestiging mag wel
                  direct naar de klant.
                </p>
              </div>

              <button
                type="button"
                className="button button-primary"
                onClick={handleAllocate}
              >
                Beschikbare voorraad alloceren
              </button>
            </div>
          </section>
        )}

      <section className={styles.metricGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Besteld
          </div>
          <div className="metric-value">
            {totals.quantity}
          </div>
          <div className="metric-detail">
            stuks
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Gereserveerd
          </div>
          <div className="metric-value">
            {availability.reservedQuantity}
          </div>
          <div className="metric-detail">
            {availability.allocationPercentage}%
            van openstaand
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Voororder / tekort
          </div>
          <div className="metric-value">
            {availability.backorderQuantity}
          </div>
          <div className="metric-detail">
            nog te alloceren
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Orderwaarde
          </div>
          <div className="metric-value">
            {formatCurrency(totals.total)}
          </div>
          <div className="metric-detail">
            inclusief btw
          </div>
        </article>
      </section>

      <section className={styles.overviewGrid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Klant en order
              </h2>
            </div>

            <StatusBadge
              label={order.status}
              tone={
                order.status ===
                  "Verzonden" ||
                order.status === "Gereed"
                  ? "success"
                  : order.status ===
                      "Gereserveerd" ||
                    order.status ===
                      "Bevestigd"
                    ? "info"
                    : order.status ===
                        "Geannuleerd"
                      ? "danger"
                      : "neutral"
              }
            />
          </div>

          <dl className={styles.detailList}>
            <div>
              <dt>Klantnummer</dt>
              <dd>{order.customerNumber}</dd>
            </div>

            <div>
              <dt>Klant</dt>
              <dd>{order.customerName}</dd>
            </div>

            <div>
              <dt>Contactpersoon</dt>
              <dd>
                {order.contactPerson || "—"}
              </dd>
            </div>

            <div>
              <dt>E-mailadres</dt>
              <dd>{order.email || "—"}</dd>
            </div>

            <div>
              <dt>Orderdatum</dt>
              <dd>
                {formatDate(order.orderDate)}
              </dd>
            </div>

            <div>
              <dt>Gewenste levering</dt>
              <dd>
                {formatDate(
                  order.requestedDeliveryDate,
                )}
              </dd>
            </div>

            <div>
              <dt>Betaaltermijn</dt>
              <dd>
                {order.paymentDays} dagen
              </dd>
            </div>

            <div>
              <dt>Klantkorting</dt>
              <dd>
                {order.discountPercentage.toLocaleString(
                  "nl-NL",
                )}
                %
              </dd>
            </div>
          </dl>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Voorraadallocatie
              </h2>
            </div>
          </div>

          <dl className={styles.detailList}>
            <div>
              <dt>Openstaand</dt>
              <dd>
                {availability.openQuantity}
              </dd>
            </div>

            <div>
              <dt>Gereserveerd</dt>
              <dd>
                {
                  availability.reservedQuantity
                }
              </dd>
            </div>

            <div>
              <dt>Voororder / tekort</dt>
              <dd>
                {
                  availability.backorderQuantity
                }
              </dd>
            </div>

            <div>
              <dt>Allocatiegraad</dt>
              <dd>
                {
                  availability.allocationPercentage
                }
                %
              </dd>
            </div>

            <div>
              <dt>Totaal</dt>
              <dd>
                {formatCurrency(totals.total)}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Orderregels
            </h2>

            <p className="content-card-description">
              Bestelde, gereserveerde en nog
              te alloceren aantallen per variant.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>SKU</th>
                <th>Kleur</th>
                <th>Maat</th>
                <th className="table-number">
                  Besteld
                </th>
                <th className="table-number">
                  Gereserveerd
                </th>
                <th className="table-number">
                  Voororder
                </th>
                <th className="table-number">
                  Geleverd
                </th>
                <th className="table-number">
                  Prijs
                </th>
                <th className="table-number">
                  Regelbedrag
                </th>
              </tr>
            </thead>

            <tbody>
              {order.lines.map((line) => {
                const lineTotal =
                  line.quantity *
                  line.unitPrice *
                  (1 -
                    line.discountPercentage /
                      100);

                const openQuantity =
                  Math.max(
                    0,
                    line.quantity -
                      line.deliveredQuantity,
                  );

                const backorderQuantity =
                  Math.max(
                    0,
                    openQuantity -
                      line.reservedQuantity,
                  );

                return (
                  <tr key={line.id}>
                    <td className="table-primary">
                      {line.productName}
                    </td>

                    <td>{line.sku}</td>
                    <td>{line.color}</td>
                    <td>{line.size}</td>

                    <td className="table-number">
                      {line.quantity}
                    </td>

                    <td className="table-number">
                      {line.reservedQuantity}
                    </td>

                    <td className="table-number">
                      <strong>
                        {backorderQuantity}
                      </strong>
                    </td>

                    <td className="table-number">
                      {line.deliveredQuantity}
                    </td>

                    <td className="table-number">
                      {formatCurrency(
                        line.unitPrice,
                      )}
                    </td>

                    <td className="table-number table-primary">
                      {formatCurrency(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {order.notes && (
        <section
          className={`content-card ${styles.notesCard}`}
        >
          <h2>Interne notitie</h2>
          <p>{order.notes}</p>
        </section>
      )}

      {(order.status === "Concept" ||
        order.status === "Bevestigd" ||
        order.status === "Gereserveerd" ||
        order.status === "Gereed") && (
        <section className={styles.dangerZone}>
          <div>
            <h2>
              {order.status === "Concept"
                ? "Conceptorder verwijderen"
                : "Order annuleren"}
            </h2>

            <p>
              {order.status === "Concept"
                ? "Deze order heeft nog geen invloed op de voorraad."
                : "Eventueel gereserveerde voorraad wordt automatisch vrijgegeven."}
            </p>
          </div>

          <button
            type="button"
            onClick={
              order.status === "Concept"
                ? handleDelete
                : handleCancel
            }
          >
            {order.status === "Concept"
              ? "Order verwijderen"
              : "Order annuleren"}
          </button>
        </section>
      )}
    </div>
  );
}
