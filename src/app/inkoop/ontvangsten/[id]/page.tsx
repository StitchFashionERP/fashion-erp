"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import styles from "../receipts.module.css";

type Receipt = {
  id: string;
  receipt_number: string;
  receipt_date: string;
  packing_slip_number: string | null;
  received_by: string | null;
  notes: string | null;
  purchase_orders?: {
    order_number: string;
    suppliers?: {
      supplier_number: string;
      company_name: string;
      contact_person: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      postal_code: string | null;
      city: string | null;
      country_code: string;
    };
  };
  purchase_receipt_lines?: Array<{
    id: string;
    variant_id: string;
    product_name: string;
    product_code: string;
    sku: string;
    color: string;
    size: string;
    quantity: number;
  }>;
};


export default function ReceiptDetailPage() {
  const [receipt, setReceipt] =
    useState<Receipt | null>(null);

  useEffect(() => {
    async function load() {
      const id =
        window.location.pathname.split("/").pop();

      const response =
        await fetch(
          `/api/purchase-receipts/${id}`,
        );

      const data =
        await response.json();

      setReceipt(data);
    }

    load();
  }, []);

  if (!receipt) {
    return null;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inkoop"
        title={receipt.receipt_number}
        description="Goederenontvangst"
        action={
          <Link
            href="/inkoop/ontvangsten"
            className="button"
          >
            Terug naar ontvangsten
          </Link>
        }
      />

      <section className="content-card">
        <div className={styles.detailsGrid}>
          <div className={styles.detailColumn}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                Inkooporder
              </span>
              <span className={styles.detailValue}>
                {receipt.purchase_orders?.order_number}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                Leverancier
              </span>
              <span className={styles.detailValue}>
                {receipt.purchase_orders?.suppliers?.company_name}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                Leveranciersnummer
              </span>
              <span className={styles.detailValue}>
                {receipt.purchase_orders?.suppliers?.supplier_number}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                Ontvangen door
              </span>
              <span className={styles.detailValue}>
                {receipt.received_by || "—"}
              </span>
            </div>
          </div>

          <div className={styles.detailColumn}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                Datum
              </span>
              <span className={styles.detailValue}>
                {receipt.receipt_date}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                Pakbon
              </span>
              <span className={styles.detailValue}>
                {receipt.packing_slip_number || "—"}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                Adres
              </span>
              <span className={styles.detailValue}>
                {receipt.purchase_orders?.suppliers?.address}
                <br />
                {receipt.purchase_orders?.suppliers?.postal_code}{" "}
                {receipt.purchase_orders?.suppliers?.city}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="content-card">
        <h2>Ontvangen regels</h2>

        <table className="data-table">
          <thead>
            <tr>
              <th>Artikel</th>
              <th>SKU</th>
              <th>Kleur</th>
              <th>Maten</th>
              <th className="table-number">
                Aantal
              </th>
            </tr>
          </thead>

          <tbody>
            {(receipt.purchase_receipt_lines ?? [])
              .map((line) => (
                <tr key={line.id}>
                  <td>
                    <div className="table-primary">
                      {line.product_name}
                    </div>
                    <div>
                      {line.product_code}
                    </div>
                  </td>

                  <td>
                    {line.sku}
                  </td>

                  <td>
                    {line.color}
                  </td>

                  <td>
                    {line.size}
                  </td>

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
