"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  loadSalesOrderById,
  type SalesOrder,
} from "@/lib/sales";
import styles from "../sales-order-detail.module.css";

export default function DeliverSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params.id);

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    loadSalesOrderById(orderId)
      .then((loaded) => {
        if (!active) return;
        setOrder(loaded);

        setQuantities(
          Object.fromEntries(
            loaded.lines.map((line) => [
              line.id,
              line.reservedQuantity,
            ]),
          ),
        );
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Verkooporder laden mislukt.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  async function handleDeliver() {
    if (!order) return;

    const lines = order.lines
      .map((line) => ({
        id: line.id,
        quantity: Math.max(
          0,
          Math.min(
            quantities[line.id] ?? 0,
            line.reservedQuantity,
          ),
        ),
      }))
      .filter((line) => line.quantity > 0);

    if (lines.length === 0) {
      setError("Vul minimaal één aantal in om te leveren.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sales-orders/${orderId}/deliver`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lines }),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ?? "Uitleveren mislukt.",
        );
      }

      router.push(`/verkoop/${orderId}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Uitleveren mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 32 }}>
        Order laden...
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ padding: 32 }}>
        <div className={styles.notFound}>
          <h1>Verkooporder niet gevonden</h1>
          <Link href="/verkoop">Terug naar verkoop</Link>
        </div>
      </main>
    );
  }

  const deliverableLines = order.lines.filter(
    (line) => line.reservedQuantity > 0,
  );

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/verkoop">Verkooporders</Link>
        <span>›</span>
        <Link href={`/verkoop/${order.id}`}>
          {order.orderNumber}
        </Link>
        <span>›</span>
        <span>Leveren</span>
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <PageHeader
        eyebrow="Verkooporder"
        title={`${order.orderNumber} — uitleveren`}
        description={`${order.customerName} · ${
          order.city || "Geen plaats"
        }`}
      />

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Klaar om te leveren
            </h2>
            <p className="content-card-description">
              Standaard staat het volledig gereserveerde
              aantal klaar. Verlaag een aantal voor een
              deellevering — het restant blijft
              gereserveerd als backorder.
            </p>
          </div>
        </div>

        {deliverableLines.length === 0 ? (
          <div style={{ padding: 20, color: "#6b7280" }}>
            Er staat momenteel niets gereserveerd om te
            leveren op deze order.
          </div>
        ) : (
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
                    Al geleverd
                  </th>
                  <th className="table-number">
                    Gereserveerd
                  </th>
                  <th className="table-number">
                    Nu leveren
                  </th>
                </tr>
              </thead>

              <tbody>
                {deliverableLines.map((line) => (
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
                      {line.deliveredQuantity}
                    </td>
                    <td className="table-number">
                      <strong>
                        {line.reservedQuantity}
                      </strong>
                    </td>
                    <td className="table-number">
                      <input
                        type="number"
                        min={0}
                        max={line.reservedQuantity}
                        value={
                          quantities[line.id] ?? 0
                        }
                        onChange={(event) => {
                          const value = Math.max(
                            0,
                            Math.min(
                              Number.parseInt(
                                event.target.value ||
                                  "0",
                                10,
                              ) || 0,
                              line.reservedQuantity,
                            ),
                          );

                          setQuantities((current) => ({
                            ...current,
                            [line.id]: value,
                          }));
                        }}
                        style={{
                          width: 64,
                          padding: "6px 4px",
                          textAlign: "right",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <Link
            href={`/verkoop/${order.id}`}
            className="button button-secondary"
          >
            Annuleren
          </Link>

          <button
            type="button"
            className="button button-primary"
            disabled={
              saving || deliverableLines.length === 0
            }
            onClick={() => void handleDeliver()}
          >
            {saving
              ? "Bezig met leveren..."
              : "Levering bevestigen"}
          </button>
        </div>
      </section>
    </div>
  );
}
