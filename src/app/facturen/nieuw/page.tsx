"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  createInvoiceFromSalesOrder,
  getInvoiceableSalesOrders,
} from "@/lib/invoices";
import {
  getSalesOrderTotals,
  type SalesOrder,
} from "@/lib/sales";
import styles from "./new-invoice.module.css";

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

export default function NewInvoicePage() {
  const router = useRouter();

  const [orders, setOrders] = useState<
    SalesOrder[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrders(getInvoiceableSalesOrders());
  }, []);

  function createInvoice(orderId: string) {
    setError("");

    try {
      const invoice =
        createInvoiceFromSalesOrder(orderId);

      router.push(`/facturen/${invoice.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De factuur kon niet worden gemaakt.",
      );
    }
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/facturen">Facturen</Link>
        <span>›</span>
        <span>Nieuwe factuur</span>
      </div>

      <PageHeader
        eyebrow="Financieel"
        title="Nieuwe factuur"
        description="Selecteer een verzonden verkooporder om hiervan een conceptfactuur te maken."
      />

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Nog te factureren verkooporders
            </h2>

            <p className="content-card-description">
              Alleen verzonden orders zonder bestaande
              factuur worden getoond.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ordernummer</th>
                <th>Klant</th>
                <th>Orderdatum</th>
                <th className="table-number">
                  Regels
                </th>
                <th className="table-number">
                  Aantal
                </th>
                <th className="table-number">
                  Totaal incl. btw
                </th>
                <th className="table-number">
                  Actie
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const totals =
                  getSalesOrderTotals(order);

                return (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>

                    <td className="table-primary">
                      {order.customerName}
                    </td>

                    <td>
                      {formatDate(order.orderDate)}
                    </td>

                    <td className="table-number">
                      {order.lines.length}
                    </td>

                    <td className="table-number">
                      {totals.quantity}
                    </td>

                    <td className="table-number table-primary">
                      {formatCurrency(totals.total)}
                    </td>

                    <td className="table-number">
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={() =>
                          createInvoice(order.id)
                        }
                      >
                        Factuur maken
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className={styles.emptyState}>
            <h2>
              Geen verkooporders beschikbaar
            </h2>

            <p>
              Verzend eerst een verkooporder of controleer
              of de order al is gefactureerd.
            </p>

            <Link
              href="/verkoop"
              className="button button-secondary"
            >
              Naar verkooporders
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
