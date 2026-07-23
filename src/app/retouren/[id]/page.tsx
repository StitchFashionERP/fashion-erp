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
  completeReturnInspection,
  createCreditNoteFromReturn,
  getCustomerReturnById,
  markReturnReceived,
  returnDispositions,
  updateReturnLine,
  type CustomerReturn,
  type ReturnDisposition,
} from "@/lib/returns";
import {
  getWarehouseLocations,
} from "@/lib/warehouse";
import styles from "./return-detail.module.css";

export default function ReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] =
    useState<CustomerReturn | null>(null);
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");
  const locations =
    getWarehouseLocations().filter(
      (location) =>
        location.active &&
        location.type !== "Ontvangst" &&
        location.type !== "Pakstation",
    );

  function reload() {
    setItem(getCustomerReturnById(params.id));
  }

  useEffect(() => {
    reload();
  }, [params.id]);

  if (!item) {
    return (
      <section className="content-card">
        <div className={styles.empty}>
          Retour niet gevonden.
        </div>
      </section>
    );
  }

  function execute(
    action: () => void,
    successMessage: string,
  ) {
    try {
      action();
      setMessage(successMessage);
      setError("");
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Actie mislukt.",
      );
      setMessage("");
    }
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/retouren">
          Retouren
        </Link>
        <span>›</span>
        <span>{item.rmaNumber}</span>
      </div>

      <PageHeader
        eyebrow="Retour"
        title={item.rmaNumber}
        description={`${item.customerName} · ${item.salesOrderNumber}`}
        action={
          <div className="button-group">
            {item.status === "Aangemeld" && (
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  execute(
                    () => {
                      markReturnReceived(item.id);
                    },
                    "Retour is ontvangen.",
                  )
                }
              >
                Markeer ontvangen
              </button>
            )}

            {item.status === "Ontvangen" && (
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  execute(
                    () => {
                      completeReturnInspection(
                        item.id,
                      );
                    },
                    "Controle afgerond en voorraad verwerkt.",
                  )
                }
              >
                Controle afronden
              </button>
            )}

            {!item.creditNoteId && (
              <button
                type="button"
                className="button button-primary"
                disabled={
                  item.status !== "Gecontroleerd" ||
                  !item.invoiceId
                }
                title={
                  !item.invoiceId
                    ? "Aan deze levering is nog geen factuur gekoppeld."
                    : item.status !== "Gecontroleerd"
                      ? "Rond eerst de retourcontrole af."
                      : "Maak een creditfactuur op basis van deze retour en de gekoppelde factuur."
                }
                onClick={() =>
                  execute(
                    () => {
                      createCreditNoteFromReturn(
                        item.id,
                      );
                    },
                    "Creditfactuur aangemaakt.",
                  )
                }
              >
                Creditfactuur maken
              </button>
            )}

            {item.creditNoteId && (
              <Link
                href={`/creditfacturen/${item.creditNoteId}`}
                className="button button-secondary"
              >
                Creditfactuur openen
              </Link>
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

      <section className={styles.summary}>
        <article className="metric-card">
          <div className="metric-label">
            Status
          </div>
          <div className={styles.statusValue}>
            <StatusBadge
              label={item.status}
              tone={
                item.status === "Afgerond"
                  ? "success"
                  : item.status === "Ontvangen"
                    ? "warning"
                    : "info"
              }
            />
          </div>
          <div className="metric-detail">
            {item.salesOrderNumber}
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Retourregels
          </div>
          <div className="metric-value">
            {item.lines.length}
          </div>
          <div className="metric-detail">
            varianten
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Retouraantal
          </div>
          <div className="metric-value">
            {item.lines.reduce(
              (total, line) =>
                total +
                line.returnQuantity,
              0,
            )}
          </div>
          <div className="metric-detail">
            stuks
          </div>
        </article>
      </section>

      <section className={styles.creditPanel}>
        <div>
          <span>Creditfactuur</span>
          <strong>
            {item.creditNoteId
              ? "Aangemaakt"
              : item.invoiceId
                ? `Gebaseerd op ${item.invoiceNumber}`
                : "Geen factuur gekoppeld"}
          </strong>
          <p>
            De creditfactuur gebruikt de
            retouraantallen en prijzen uit de
            oorspronkelijke factuur.
          </p>
        </div>

        {!item.creditNoteId && (
          <span className={styles.creditHint}>
            {!item.invoiceId
              ? "Koppel eerst een factuur aan deze retour."
              : item.status !== "Gecontroleerd"
                ? "Rond eerst de retourcontrole af."
                : "Klaar om te crediteren."}
          </span>
        )}
      </section>

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Variant</th>
                <th>Reden</th>
                <th className="table-number">
                  Aantal
                </th>
                <th>Beoordeling</th>
                <th>Voorraadlocatie</th>
              </tr>
            </thead>

            <tbody>
              {item.lines.map((line) => (
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
                  <td>{line.reason}</td>
                  <td className="table-number">
                    {line.returnQuantity}
                  </td>
                  <td>
                    <select
                      disabled={
                        item.status !==
                        "Ontvangen"
                      }
                      value={line.disposition}
                      onChange={(event) => {
                        const updated =
                          updateReturnLine(
                            item.id,
                            line.id,
                            {
                              disposition:
                                event.target
                                  .value as ReturnDisposition,
                            },
                          );

                        if (updated) {
                          setItem(updated);
                        }
                      }}
                    >
                      {returnDispositions.map(
                        (disposition) => (
                          <option key={disposition}>
                            {disposition}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td>
                    <select
                      disabled={
                        item.status !==
                          "Ontvangen" ||
                        line.disposition ===
                          "Nog beoordelen"
                      }
                      value={
                        line.warehouseLocationId
                      }
                      onChange={(event) => {
                        const updated =
                          updateReturnLine(
                            item.id,
                            line.id,
                            {
                              warehouseLocationId:
                                event.target.value,
                            },
                          );

                        if (updated) {
                          setItem(updated);
                        }
                      }}
                    >
                      <option value="">
                        Selecteer locatie
                      </option>
                      {locations.map(
                        (location) => (
                          <option
                            key={location.id}
                            value={location.id}
                          >
                            {location.code} ·{" "}
                            {location.name}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
