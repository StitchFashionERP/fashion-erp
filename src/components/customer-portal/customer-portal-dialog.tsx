"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  createBusinessDocumentPdfAttachment,
} from "@/lib/document-pdf";
import {
  getCompanySettings,
} from "@/lib/company-settings";
import {
  createCustomerPortal,
} from "@/lib/customer-portal-client";
import {
  getSalesOrderTotals,
  type SalesOrder,
} from "@/lib/sales";
import type {
  CustomerPortalSummary,
} from "@/lib/customer-portal-types";
import styles from "./customer-portal-dialog.module.css";

export function CustomerPortalDialog({
  order,
  open,
  onClose,
  onCreated,
}: {
  order: SalesOrder;
  open: boolean;
  onClose: () => void;
  onCreated?: (
    summary: CustomerPortalSummary,
  ) => void;
}) {
  const [expiresInDays, setExpiresInDays] =
    useState("14");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] =
    useState<CustomerPortalSummary | null>(
      null,
    );

  const totals = useMemo(
    () => getSalesOrderTotals(order),
    [order],
  );

  if (!open) return null;

  async function createPortal() {
    setLoading(true);
    setError("");

    try {
      const attachment =
        await createBusinessDocumentPdfAttachment(
          "SALES_ORDER_CONFIRMATION",
          order.id,
        );
      const settings =
        getCompanySettings();

      const result =
        await createCustomerPortal({
          order: {
            orderId: order.id,
            orderNumber:
              order.orderNumber,
            customerName:
              order.customerName,
            contactPerson:
              order.contactPerson,
            email: order.email,
            orderDate: order.orderDate,
            requestedDeliveryDate:
              order.requestedDeliveryDate,
            paymentDays:
              order.paymentDays,
            notes: order.notes,
            subtotal: totals.subtotal,
            vat: totals.vat,
            total: totals.total,
            currency: "EUR",
            lines: order.lines.map(
              (line) => ({
                productCode:
                  line.productCode,
                productName:
                  line.productName,
                sku: line.sku,
                color: line.color,
                size: line.size,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discountPercentage:
                  line.discountPercentage,
                lineTotal:
                  line.quantity *
                  line.unitPrice *
                  (1 -
                    line.discountPercentage /
                      100),
              }),
            ),
          },
          company: {
            name:
              settings.company.name,
            tradeName:
              settings.company.tradeName,
            email:
              settings.company.email,
            phone:
              settings.company.phone,
            website:
              settings.company.website,
            logoDataUrl:
              settings.company.logoDataUrl,
          },
          pdfFilename:
            attachment.filename,
          pdfBase64:
            attachment.content,
          expiresInDays:
            Number(expiresInDays) || 14,
        });

      setSummary(result);
      onCreated?.(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Aanmaken is mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(
      value,
    );
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section className={styles.dialog}>
        <div className={styles.header}>
          <div>
            <h2>
              Online laten goedkeuren
            </h2>
            <p>
              De klant krijgt een vertrouwde
              portalpagina én een afzonderlijke
              verificatiecode.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {!summary ? (
          <>
            <div className={styles.body}>
              <div className={styles.info}>
                <strong>
                  {order.orderNumber}
                </strong>
                <span>
                  {order.customerName}
                </span>
              </div>

              <label>
                <span>
                  Toegang geldig gedurende
                </span>
                <select
                  value={expiresInDays}
                  onChange={(event) =>
                    setExpiresInDays(
                      event.target.value,
                    )
                  }
                >
                  <option value="7">
                    7 dagen
                  </option>
                  <option value="14">
                    14 dagen
                  </option>
                  <option value="30">
                    30 dagen
                  </option>
                </select>
              </label>

              <div className={styles.explanation}>
                <strong>
                  Veilige werkwijze
                </strong>
                <p>
                  Stuur de portal-link en de
                  verificatiecode in dezelfde
                  reguliere ordermail, maar toon
                  duidelijk het officiële
                  portaladres. De klant kan de PDF
                  openen, downloaden, printen en
                  later terugkomen.
                </p>
              </div>

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className="button button-secondary"
                onClick={onClose}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={loading}
                onClick={createPortal}
              >
                {loading
                  ? "Aanmaken..."
                  : "Portaal aanmaken"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.body}>
              <div className={styles.success}>
                Portaal is aangemaakt
              </div>

              <label>
                <span>Portal-link</span>
                <div className={styles.copyRow}>
                  <input
                    readOnly
                    value={summary.portalUrl}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copy(
                        summary.portalUrl,
                      )
                    }
                  >
                    Kopiëren
                  </button>
                </div>
              </label>

              <label>
                <span>
                  Verificatiecode
                </span>
                <div className={styles.copyRow}>
                  <input
                    readOnly
                    value={
                      summary.verificationCode
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copy(
                        summary.verificationCode,
                      )
                    }
                  >
                    Kopiëren
                  </button>
                </div>
              </label>

              <a
                href={summary.portalUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.preview}
              >
                Portaal bekijken
              </a>
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className="button button-primary"
                onClick={onClose}
              >
                Gereed
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
