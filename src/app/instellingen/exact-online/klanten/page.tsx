"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getCustomers,
} from "@/lib/master-data";
import {
  getExactCustomerLink,
  importCustomerFromExact,
  linkCustomerToExact,
  mockExactCustomers,
  syncCustomerToExact,
} from "@/lib/exact-bridge";
import styles from "./exact-customers.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function ExactCustomersPage() {
  const [version, setVersion] =
    useState(0);
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  const customers = useMemo(
    () => getCustomers(),
    [version],
  );

  function execute(
    action: () => void,
    successMessage: string,
  ) {
    try {
      action();
      setMessage(successMessage);
      setError("");
      setVersion((current) => current + 1);
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
      <PageHeader
        eyebrow="Exact Online Bridge"
        title="Klantensynchronisatie"
        description="STITCH is leidend voor klantgegevens, prijsafspraken en betalingstermijnen."
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

      <section className={styles.grid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                STITCH-klanten
              </h2>
              <p className="content-card-description">
                Koppel bestaande Exact-relaties of
                maak een mockrelatie aan.
              </p>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Klant</th>
                  <th>Betaalconditie</th>
                  <th>Exact</th>
                  <th className="table-number">
                    Openstaand
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => {
                  const link =
                    getExactCustomerLink(
                      customer.id,
                    );

                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="table-primary">
                          {customer.companyName}
                        </div>
                        <div className={styles.meta}>
                          {customer.customerNumber} ·{" "}
                          {customer.email}
                        </div>
                      </td>

                      <td>
                        {customer.paymentDays} dagen
                        netto
                        {customer.paymentDiscountPercentage >
                          0 && (
                          <div
                            className={styles.meta}
                          >
                            {
                              customer.paymentDiscountPercentage
                            }
                            % binnen{" "}
                            {
                              customer.paymentDiscountDays
                            }{" "}
                            dagen
                          </div>
                        )}
                      </td>

                      <td>
                        {link ? (
                          <>
                            <strong>
                              {
                                link.exactCustomerCode
                              }
                            </strong>
                            <div
                              className={
                                styles.meta
                              }
                            >
                              {link.status}
                            </div>
                          </>
                        ) : (
                          "Niet gekoppeld"
                        )}
                      </td>

                      <td className="table-number">
                        {link
                          ? money(link.openAmount)
                          : "—"}
                      </td>

                      <td className="table-number">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() =>
                            execute(
                              () => {
                                syncCustomerToExact(
                                  customer.id,
                                );
                              },
                              `${customer.companyName} is gesynchroniseerd.`,
                            )
                          }
                        >
                          {link
                            ? "Synchroniseren"
                            : "Koppelen"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Mockklanten uit Exact
              </h2>
              <p className="content-card-description">
                Test de eerste import en
                matchingflow.
              </p>
            </div>
          </div>

          <div className={styles.importList}>
            {mockExactCustomers.map(
              (customer) => (
                <article
                  key={customer.exactAccountId}
                  className={styles.importCard}
                >
                  <div>
                    <strong>
                      {customer.companyName}
                    </strong>
                    <span>
                      Exact-code{" "}
                      {customer.exactCustomerCode}
                    </span>
                    <span>
                      {customer.city} ·{" "}
                      {customer.email}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      execute(
                        () => {
                          importCustomerFromExact(
                            customer.exactAccountId,
                          );
                        },
                        `${customer.companyName} is geïmporteerd of gekoppeld.`,
                      )
                    }
                  >
                    Importeren
                  </button>
                </article>
              ),
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
