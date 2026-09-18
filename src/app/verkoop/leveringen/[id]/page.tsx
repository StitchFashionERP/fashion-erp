"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentActionButtons } from "@/components/documents/document-action-buttons";

type Delivery = {
  id: string;
  delivery_number: string;
  delivery_date: string;
  sales_order_id: string;
  sales_orders?: {
    order_number: string;
    customers?: {
      company_name: string;
      contact_person: string | null;
      email: string | null;
      city: string | null;
    };
  };
  sales_delivery_lines?: Array<{
    id: string;
    product_name: string;
    product_code: string;
    sku: string;
    color: string;
    size: string;
    quantity: number;
  }>;
};

export default function SalesDeliveryDetailPage() {
  const params = useParams();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`/api/sales-deliveries/${params.id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "Levering laden mislukt.");
        }
        return body as Delivery;
      })
      .then((data) => {
        if (active) setDelivery(data);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Levering laden mislukt.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <div style={{ padding: 16, background: "#fee2e2" }}>
          {error}
        </div>
      </main>
    );
  }

  if (!delivery) {
    return (
      <main style={{ padding: 32 }}>
        Levering laden...
      </main>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Verkoop"
        title={delivery.delivery_number}
        description="Pakbon / levering"
        action={
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href={`/verkoop/${delivery.sales_order_id}`}
              className="button button-secondary"
            >
              Terug naar order
            </Link>

            <DocumentActionButtons
              referenceId={delivery.id}
              documentType="PACKING_SLIP"
              printLabel="Pakbon PDF"
              emailLabel="Pakbon mailen"
            />
          </div>
        }
      />

      <section className="content-card">
        <div style={{ display: "flex", gap: 48, padding: 20 }}>
          <div>
            <div style={{ color: "#6b7280" }}>Verkooporder</div>
            <strong>
              {delivery.sales_orders?.order_number}
            </strong>
          </div>

          <div>
            <div style={{ color: "#6b7280" }}>Klant</div>
            <strong>
              {delivery.sales_orders?.customers?.company_name}
            </strong>
          </div>

          <div>
            <div style={{ color: "#6b7280" }}>Datum</div>
            <strong>{delivery.delivery_date}</strong>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h2>Geleverde regels</h2>

        <table className="data-table">
          <thead>
            <tr>
              <th>Artikel</th>
              <th>SKU</th>
              <th>Kleur</th>
              <th>Maat</th>
              <th className="table-number">Aantal</th>
            </tr>
          </thead>

          <tbody>
            {(delivery.sales_delivery_lines ?? []).map((line) => (
              <tr key={line.id}>
                <td>
                  <div className="table-primary">
                    {line.product_name}
                  </div>
                  <div>{line.product_code}</div>
                </td>
                <td>{line.sku}</td>
                <td>{line.color}</td>
                <td>{line.size}</td>
                <td className="table-number">
                  {line.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
