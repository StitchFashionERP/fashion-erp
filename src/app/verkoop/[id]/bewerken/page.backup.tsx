"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import {
  loadSalesOrderById,
  type SalesOrder,
  type SalesOrderStatus,
} from "@/lib/sales";

export default function EditSalesOrderPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = await loadSalesOrderById(id);

        if (result.status !== "Concept") {
          setError("Alleen conceptorders kunnen worden bewerkt.");
          return;
        }

        setOrder(result);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Order laden mislukt.",
        );
      }
    }

    void load();
  }, [id]);

  async function save() {
    if (!order) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sales-orders/${order.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(order),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ?? "Opslaan mislukt.",
        );
      }

      router.push(`/verkoop/${order.id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Opslaan mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!order) {
    return (
      <div className="content-card">
        {error || "Order laden..."}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Verkooporder"
        title={`Order bewerken ${order.orderNumber}`}
        description="Pas een conceptorder aan voordat deze wordt bevestigd."
        actions={
          <Link
            href={`/verkoop/${order.id}`}
            className="button button-secondary"
          >
            Annuleren
          </Link>
        }
      />

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <section className="content-card">
        <div className="content-card-header">
          <h2 className="content-card-title">
            Ordergegevens
          </h2>
        </div>

        <div className="form-grid">
          <label>
            Leverdatum
            <input
              type="date"
              value={
                order.requestedDeliveryDate ?? ""
              }
              onChange={(e) =>
                setOrder({
                  ...order,
                  requestedDeliveryDate:
                    e.target.value,
                })
              }
            />
          </label>

          <label>
            Status
            <select
              value={order.status}
              onChange={(e) =>
                setOrder({
                  ...order,
                  status:
                    e.target.value as SalesOrderStatus,
                })
              }
            >
              <option value="Concept">
                Concept
              </option>
              <option value="Bevestigd">
                Bevestigd
              </option>
            </select>
          </label>
        </div>

        <label>
          Notitie
          <textarea
            value={order.notes ?? ""}
            onChange={(e) =>
              setOrder({
                ...order,
                notes: e.target.value,
              })
            }
          />
        </label>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <h2 className="content-card-title">
            Orderregels
          </h2>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Kleur</th>
                <th>Maat</th>
                <th className="table-number">
                  Aantal
                </th>
              </tr>
            </thead>

            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    {line.productName}
                  </td>
                  <td>
                    {line.color}
                  </td>
                  <td>
                    {line.size}
                  </td>
                  <td className="table-number">
                    <input
                      type="number"
                      min="0"
                      value={line.quantity}
                      onChange={(e) => {
                        const quantity =
                          Number(e.target.value) || 0;

                        setOrder({
                          ...order,
                          lines:
                            order.lines.map(
                              (item) =>
                                item.id === line.id
                                  ? {
                                      ...item,
                                      quantity,
                                    }
                                  : item,
                            ),
                        });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="button-group">
        <button
          className="button button-primary"
          disabled={saving}
          onClick={save}
        >
          {saving
            ? "Opslaan..."
            : "Order opslaan"}
        </button>
      </div>
    </>
  );
}
