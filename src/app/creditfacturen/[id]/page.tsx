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
import { DocumentActionButtons } from "@/components/documents/document-action-buttons";
import {
  getCreditNoteById,
  type CreditNote,
} from "@/lib/returns";
import {
  exportCreditNoteToExactSandbox,
} from "@/lib/exact-bridge";
import styles from "./credit-detail.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [note, setNote] =
    useState<CreditNote | null>(null);
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  function reload() {
    setNote(getCreditNoteById(params.id));
  }

  useEffect(() => {
    reload();
  }, [params.id]);

  function exportToExact() {
    if (!note) {
      setError("Creditfactuur niet gevonden.");
      setMessage("");
      return;
    }

    try {
      exportCreditNoteToExactSandbox(note.id);

      setMessage(
        `${note.creditNumber} is naar de Exact-sandbox geëxporteerd.`,
      );
      setError("");
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Export mislukt.",
      );
      setMessage("");
    }
  }

  if (!note) {
    return (
      <section className="content-card">
        <div className={styles.empty}>
          Creditfactuur niet gevonden.
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/creditfacturen">
          Creditfacturen
        </Link>
        <span>›</span>
        <span>{note.creditNumber}</span>
      </div>

      <PageHeader
        eyebrow="Creditfactuur"
        title={note.creditNumber}
        description={`${note.customerName} · credit op ${note.originalInvoiceNumber}`}
        action={
          <div className="button-group">
            <DocumentActionButtons
              referenceId={note.id}
              documentType="CREDIT_NOTE"
              printLabel="Creditfactuur PDF"
              emailLabel="Creditfactuur mailen"
            />

            {note.exactExportStatus !==
              "Geëxporteerd" && (
              <button
                type="button"
                className="button button-secondary"
                onClick={exportToExact}
              >
                Exporteren naar Exact
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

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Variant</th>
                <th className="table-number">
                  Aantal
                </th>
                <th className="table-number">
                  Prijs
                </th>
                <th className="table-number">
                  Bedrag
                </th>
              </tr>
            </thead>

            <tbody>
              {note.lines.map((line) => (
                <tr key={line.id}>
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
                    {line.quantity}
                  </td>

                  <td className="table-number">
                    {money(line.unitPrice)}
                  </td>

                  <td className="table-number">
                    {money(line.lineSubtotal)}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={4}>
                  Subtotaal
                </td>

                <td className="table-number">
                  {money(note.subtotal)}
                </td>
              </tr>

              <tr>
                <td colSpan={4}>
                  BTW {note.vatRate}%
                </td>

                <td className="table-number">
                  {money(note.vatAmount)}
                </td>
              </tr>

              <tr>
                <td colSpan={4}>
                  <strong>Totaal credit</strong>
                </td>

                <td className="table-number">
                  <strong>
                    {money(note.total)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}