"use client";

import styles from "../suppliers.module.css";
import {
  createEmptyPaymentTerm,
  type PaymentMoment,
  type PaymentTerm,
  type SetSupplier,
  type Supplier,
} from "./types";

type Props = {
  supplier: Supplier;
  setSupplier: SetSupplier;
};

const paymentMoments: PaymentMoment[] = [
  "Voor levering",
  "Bij levering",
  "Na factuurdatum",
];

export function SupplierFinancialTab({
  supplier,
  setSupplier,
}: Props) {
  function updatePaymentTerm(
    paymentTermId: string,
    updater: (paymentTerm: PaymentTerm) => PaymentTerm,
  ) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      paymentTerms: currentSupplier.paymentTerms.map(
        (paymentTerm) =>
          paymentTerm.id === paymentTermId
            ? updater(paymentTerm)
            : paymentTerm,
      ),
    }));
  }

  function addPaymentTerm() {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      paymentTerms: [
        ...currentSupplier.paymentTerms,
        createEmptyPaymentTerm(),
      ],
    }));
  }

  function removePaymentTerm(paymentTermId: string) {
    setSupplier((currentSupplier) => {
      const paymentTerms = currentSupplier.paymentTerms.filter(
        (paymentTerm) => paymentTerm.id !== paymentTermId,
      );

      return {
        ...currentSupplier,
        paymentTerms:
          paymentTerms.length > 0
            ? paymentTerms
            : [createEmptyPaymentTerm()],
      };
    });
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <div>
          <h3>E-mailinstellingen</h3>
          <p>Standaard ontvangers en CC-adressen per leveranciersmail.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <label><span>Inkooporder e-mailadres</span><input type="email" value={supplier.purchaseOrderEmail} placeholder={supplier.email || "orders@leverancier.nl"} onChange={(event) => setSupplier((current) => ({ ...current, purchaseOrderEmail: event.target.value }))} /></label>
        <label><span>CC inkooporders</span><input value={supplier.purchaseOrderCc} placeholder="contact@leverancier.nl, inkoper@bedrijf.nl" onChange={(event) => setSupplier((current) => ({ ...current, purchaseOrderCc: event.target.value }))} /></label>
        <label><span>Algemene CC</span><input value={supplier.generalCc} onChange={(event) => setSupplier((current) => ({ ...current, generalCc: event.target.value }))} /></label>
        <label><span>Afwijkingsmelding e-mailadres</span><input type="email" value={supplier.deviationEmail} placeholder={supplier.email || "quality@leverancier.nl"} onChange={(event) => setSupplier((current) => ({ ...current, deviationEmail: event.target.value }))} /></label>
        <label><span>CC afwijkingsmeldingen</span><input value={supplier.deviationCc} onChange={(event) => setSupplier((current) => ({ ...current, deviationCc: event.target.value }))} /></label>
      </div>

      <div className={styles.sectionHeader}>
        <div>
          <h3>Financiële gegevens</h3>
          <p>
            Beheer valuta, bestelvoorwaarden en
            betalingsafspraken.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <label>
          <span>Valuta</span>

          <select
            value={supplier.currency}
            onChange={(event) =>
              setSupplier((currentSupplier) => ({
                ...currentSupplier,
                currency: event.target.value,
              }))
            }
          >
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - Amerikaanse dollar</option>
            <option value="GBP">GBP - Britse pond</option>
            <option value="CHF">CHF - Zwitserse frank</option>
            <option value="CNY">CNY - Chinese yuan</option>
            <option value="TRY">TRY - Turkse lira</option>
          </select>
        </label>

        <label>
          <span>Minimale bestelhoeveelheid (MOQ)</span>

          <input
            type="number"
            min="0"
            step="1"
            value={supplier.moq ?? ""}
            onChange={(event) =>
              setSupplier((currentSupplier) => ({
                ...currentSupplier,
                moq:
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
              }))
            }
          />
        </label>

        <label>
          <span>Minimale bestelwaarde (MOV)</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={supplier.mov ?? ""}
            onChange={(event) =>
              setSupplier((currentSupplier) => ({
                ...currentSupplier,
                mov:
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
              }))
            }
          />
        </label>

        <label>
          <span>Standaard levertijd in dagen</span>

          <input
            type="number"
            min="0"
            step="1"
            value={supplier.leadTimeDays ?? ""}
            onChange={(event) =>
              setSupplier((currentSupplier) => ({
                ...currentSupplier,
                leadTimeDays:
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
              }))
            }
          />
        </label>
      </div>

      <div className={styles.sectionHeader}>
        <div>
          <h3>Betalingsvoorwaarden</h3>
          <p>
            Voeg één of meerdere betalingstermijnen toe.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={addPaymentTerm}
        >
          + Betalingstermijn
        </button>
      </div>

      {supplier.paymentTerms.map(
        (paymentTerm, paymentTermIndex) => (
          <section
            key={paymentTerm.id}
            className={styles.card}
          >
            <div className={styles.sectionHeader}>
              <h3>
                Betalingstermijn {paymentTermIndex + 1}
              </h3>

              <button
                type="button"
                className="button button-danger"
                onClick={() =>
                  removePaymentTerm(paymentTerm.id)
                }
              >
                Verwijderen
              </button>
            </div>

            <div className={styles.grid}>
              <label>
                <span>Percentage van factuur</span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={paymentTerm.percentage}
                  onChange={(event) =>
                    updatePaymentTerm(
                      paymentTerm.id,
                      (current) => ({
                        ...current,
                        percentage: Number(event.target.value),
                      }),
                    )
                  }
                />
              </label>

              <label>
                <span>Betaalmoment</span>

                <select
                  value={paymentTerm.moment}
                  onChange={(event) =>
                    updatePaymentTerm(
                      paymentTerm.id,
                      (current) => ({
                        ...current,
                        moment:
                          event.target.value as PaymentMoment,
                      }),
                    )
                  }
                >
                  {paymentMoments.map((paymentMoment) => (
                    <option
                      key={paymentMoment}
                      value={paymentMoment}
                    >
                      {paymentMoment}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Aantal dagen</span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={paymentTerm.days}
                  disabled={
                    paymentTerm.moment !== "Na factuurdatum"
                  }
                  onChange={(event) =>
                    updatePaymentTerm(
                      paymentTerm.id,
                      (current) => ({
                        ...current,
                        days: Number(event.target.value),
                      }),
                    )
                  }
                />
              </label>

              <label>
                <span>Betalingskorting (%)</span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={paymentTerm.discountPercentage}
                  onChange={(event) =>
                    updatePaymentTerm(
                      paymentTerm.id,
                      (current) => ({
                        ...current,
                        discountPercentage: Number(
                          event.target.value,
                        ),
                      }),
                    )
                  }
                />
              </label>
            </div>
          </section>
        ),
      )}
    </>
  );
}