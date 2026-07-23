"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  createReturnFromInvoice,
  getCustomerReturns,
  returnReasons,
  type CustomerReturn,
  type ReturnReason,
} from "@/lib/returns";
import {
  getInvoices,
  type Invoice,
} from "@/lib/invoices";
import styles from "./new-return.module.css";

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL").format(
    new Date(`${value}T12:00:00`),
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function NewReturnPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>(
    [],
  );
  const [existingReturns, setExistingReturns] =
    useState<CustomerReturn[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [invoiceId, setInvoiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({});
  const [reasons, setReasons] = useState<
    Record<string, ReturnReason>
  >({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const availableInvoices = getInvoices()
      .filter((invoice) =>
        [
          "Definitief",
          "Verzonden",
          "Deels betaald",
          "Betaald",
          "Vervallen",
        ].includes(invoice.status),
      )
      .sort((first, second) =>
        second.invoiceDate.localeCompare(
          first.invoiceDate,
        ),
      );

    setInvoices(availableInvoices);
    setExistingReturns(getCustomerReturns());
    setLoaded(true);
  }, []);

  const invoice = useMemo(
    () =>
      invoices.find(
        (item) => item.id === invoiceId,
      ) ?? null,
    [invoices, invoiceId],
  );

  function alreadyReturned(invoiceLineId: string) {
    return existingReturns
      .filter(
        (customerReturn) =>
          customerReturn.invoiceId === invoiceId,
      )
      .flatMap(
        (customerReturn) => customerReturn.lines,
      )
      .filter(
        (line) =>
          line.invoiceLineId === invoiceLineId,
      )
      .reduce(
        (total, line) =>
          total + line.returnQuantity,
        0,
      );
  }

  const totalReturnQuantity = useMemo(
    () =>
      Object.values(quantities).reduce(
        (total, quantity) =>
          total + Math.max(0, quantity),
        0,
      ),
    [quantities],
  );

  function selectInvoice(value: string) {
    setInvoiceId(value);
    setQuantities({});
    setReasons({});
    setError("");
  }

  function updateQuantity(
    lineId: string,
    value: number,
    maximum: number,
  ) {
    const quantity = Math.min(
      maximum,
      Math.max(0, Math.floor(value || 0)),
    );

    setQuantities((current) => ({
      ...current,
      [lineId]: quantity,
    }));
  }

  function updateReason(
    lineId: string,
    reason: ReturnReason,
  ) {
    setReasons((current) => ({
      ...current,
      [lineId]: reason,
    }));
  }

  function save() {
    if (!invoice) {
      setError("Selecteer eerst een factuur.");
      return;
    }

    if (totalReturnQuantity === 0) {
      setError(
        "Vul minimaal één retouraantal in.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const created = createReturnFromInvoice({
        invoiceId: invoice.id,
        notes,
        lineQuantities: quantities,
        reasons,
      });

      router.push(`/retouren/${created.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Retour aanmaken is niet gelukt.",
      );

      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Retouren"
        title="Nieuwe retour"
        description="Selecteer de factuur waarop de retour betrekking heeft."
      />

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <section className="content-card">
        <div className={styles.form}>
          <label>
            <span>Factuur</span>

            <select
              value={invoiceId}
              disabled={!loaded || saving}
              onChange={(event) =>
                selectInvoice(event.target.value)
              }
            >
              <option value="">
                {loaded
                  ? "Selecteer factuur"
                  : "Facturen laden..."}
              </option>

              {invoices.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.invoiceNumber} ·{" "}
                  {item.customerName} ·{" "}
                  {formatDate(item.invoiceDate)} ·{" "}
                  {formatCurrency(item.total)}
                </option>
              ))}
            </select>
          </label>

          {loaded && invoices.length === 0 && (
            <div className={styles.error}>
              Er zijn nog geen definitieve of
              verzonden facturen beschikbaar voor
              retour.
            </div>
          )}

          {invoice && (
            <>
              <div className={styles.deliveryInfo}>
                <div>
                  <span>Factuur</span>
                  <strong>
                    {invoice.invoiceNumber}
                  </strong>
                </div>

                <div>
                  <span>Klant</span>
                  <strong>
                    {invoice.customerName}
                  </strong>
                </div>

                <div>
                  <span>Factuurdatum</span>
                  <strong>
                    {formatDate(
                      invoice.invoiceDate,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Verkooporder</span>
                  <strong>
                    {invoice.salesOrderNumber ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{invoice.status}</strong>
                </div>

                <div>
                  <span>Factuurbedrag</span>
                  <strong>
                    {formatCurrency(invoice.total)}
                  </strong>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Artikel</th>
                      <th>Variant</th>
                      <th className="table-number">
                        Gefactureerd
                      </th>
                      <th className="table-number">
                        Eerder retour
                      </th>
                      <th className="table-number">
                        Beschikbaar
                      </th>
                      <th className="table-number">
                        Nu retour
                      </th>
                      <th>Reden</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoice.lines.map((line) => {
                      const returned =
                        alreadyReturned(line.id);

                      const returnable = Math.max(
                        0,
                        line.quantity - returned,
                      );

                      const selectedQuantity =
                        quantities[line.id] ?? 0;

                      return (
                        <tr key={line.id}>
                          <td>
                            {line.productName}

                            <div
                              className={styles.meta}
                            >
                              {line.productCode} ·{" "}
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
                            {returned}
                          </td>

                          <td className="table-number">
                            {returnable}
                          </td>

                          <td className="table-number">
                            <input
                              className={
                                styles.quantity
                              }
                              type="number"
                              min={0}
                              max={returnable}
                              step={1}
                              disabled={
                                returnable === 0 ||
                                saving
                              }
                              value={selectedQuantity}
                              onChange={(event) =>
                                updateQuantity(
                                  line.id,
                                  Number(
                                    event.target.value,
                                  ),
                                  returnable,
                                )
                              }
                            />
                          </td>

                          <td>
                            <select
                              value={
                                reasons[line.id] ||
                                "Anders"
                              }
                              disabled={
                                returnable === 0 ||
                                saving
                              }
                              onChange={(event) =>
                                updateReason(
                                  line.id,
                                  event.target
                                    .value as ReturnReason,
                                )
                              }
                            >
                              {returnReasons.map(
                                (reason) => (
                                  <option
                                    key={reason}
                                    value={reason}
                                  >
                                    {reason}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.deliveryInfo}>
                <div>
                  <span>Totaal retour</span>
                  <strong>
                    {totalReturnQuantity} stuks
                  </strong>
                </div>
              </div>
            </>
          )}

          <label>
            <span>Notities</span>

            <textarea
              value={notes}
              disabled={saving}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Bijzonderheden bij de retour..."
            />
          </label>

          <div className={styles.actions}>
            <button
              type="button"
              className="button button-primary"
              disabled={
                !invoice ||
                totalReturnQuantity === 0 ||
                saving
              }
              onClick={save}
            >
              {saving
                ? "Retour aanmaken..."
                : "Retour aanmaken"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}