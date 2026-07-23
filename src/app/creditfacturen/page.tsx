"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getCreditNotes,
  type CreditNote,
} from "@/lib/returns";
import styles from "./credit-notes.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function CreditNotesPage() {
  const [notes, setNotes] = useState<
    CreditNote[]
  >([]);

  useEffect(() => {
    setNotes(getCreditNotes());
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Facturatie"
        title="Creditfacturen"
        description="Bekijk credits uit retouren en de exportstatus naar Exact."
      />

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Creditnummer</th>
                <th>Klant</th>
                <th>Originele factuur</th>
                <th>RMA</th>
                <th className="table-number">
                  Bedrag
                </th>
                <th>Exact</th>
              </tr>
            </thead>

            <tbody>
              {notes.map((note) => (
                <tr key={note.id}>
                  <td>
                    <Link
                      href={`/creditfacturen/${note.id}`}
                      className="table-link"
                    >
                      {note.creditNumber}
                    </Link>
                  </td>
                  <td className="table-primary">
                    {note.customerName}
                  </td>
                  <td>
                    {note.originalInvoiceNumber}
                  </td>
                  <td>{note.rmaNumber}</td>
                  <td className="table-number">
                    {money(note.total)}
                  </td>
                  <td>
                    {note.exactExportStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {notes.length === 0 && (
          <div className={styles.empty}>
            Nog geen creditfacturen.
          </div>
        )}
      </section>
    </div>
  );
}
