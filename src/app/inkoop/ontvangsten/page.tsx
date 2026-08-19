"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import styles from "./receipts.module.css";


type PurchaseReceipt = {
  id: string;
  receiptNumber: string;
  purchaseOrderNumber: string;
  supplierName: string;
  receiptDate: string;
  packingSlipNumber: string;
  receivedBy: string;
  lines: Array<{
    quantity: number;
  }>;
};

function date(value: string) {
  return value
    ? new Intl.DateTimeFormat("nl-NL").format(
        new Date(`${value}T12:00:00`),
      )
    : "—";
}

export default function PurchaseReceiptsPage() {
  const [receipts, setReceipts] = useState<
    PurchaseReceipt[]
  >([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadReceipts() {
      const response =
        await fetch(
          "/api/purchase-receipts",
        );

      const data =
        await response.json();

      setReceipts(
        Array.isArray(data)
          ? data
          : [],
      );
    }

    loadReceipts();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return receipts.filter(
      (receipt) =>
        !query ||
        [
          receipt.receiptNumber,
          receipt.purchaseOrderNumber,
          receipt.supplierName,
          receipt.packingSlipNumber,
          receipt.receivedBy,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [receipts, search]);

  return (
    <div>
      <PageHeader
        eyebrow="Inkoop"
        title="Ontvangsten"
        description="Bekijk alle geboekte ontvangsten vanuit inkooporders."
      />

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
              placeholder="Zoek ontvangst, inkooporder of leverancier..."
            />
          </div>

          <div className={styles.count}>
            {filtered.length} ontvangsten
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ontvangst</th>
                <th>Inkooporder</th>
                <th>Leverancier</th>
                <th>Datum</th>
                <th>Pakbon</th>
                <th>Ontvangen door</th>
                <th className="table-number">
                  Regels
                </th>
                <th className="table-number">
                  Stuks
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="table-primary">
                    <Link href={`/inkoop/ontvangsten/${receipt.id}`}>
                      {receipt.receiptNumber}
                    </Link>
                  </td>
                  <td>
                    {receipt.purchaseOrderNumber}
                  </td>
                  <td>{receipt.supplierName}</td>
                  <td>
                    {date(receipt.receiptDate)}
                  </td>
                  <td>
                    {receipt.packingSlipNumber ||
                      "—"}
                  </td>
                  <td>
                    {receipt.receivedBy || "—"}
                  </td>
                  <td className="table-number">
                    {receipt.lines.length}
                  </td>
                  <td className="table-number">
                    {receipt.lines.reduce(
                      (total, line) =>
                        total + line.quantity,
                      0,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            Nog geen ontvangsten geboekt.
          </div>
        )}
      </section>
    </div>
  );
}
