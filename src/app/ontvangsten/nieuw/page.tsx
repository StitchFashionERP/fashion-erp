"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { BarcodeScannerInput } from "@/components/scanning/barcode-scanner-input";
import {
  assignUnknownBarcodeToVariant,
  registerBarcodeScan,
} from "@/lib/barcodes";
import {
  createGoodsReceipt,
  findGoodsReceiptLineByBarcode,
  getGoodsReceiptDraftLines,
  getOpenGoodsReceiptOrders,
  getPurchaseOrderForReceipt,
  type GoodsReceiptDraftLine,
  type GoodsReceiptOrderRow,
} from "@/lib/goods-receipts";
import styles from "./new-goods-receipt.module.css";

type ReceiptForm = {
  receiptDate: string;
  packingSlipNumber: string;
  receivedBy: string;
  notes: string;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(
  value: number,
  currency = "EUR",
) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function NewGoodsReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialOrderId =
    searchParams.get("orderId") ?? "";

  const [orders, setOrders] =
    useState<GoodsReceiptOrderRow[]>([]);

  const [selectedOrderId, setSelectedOrderId] =
    useState(initialOrderId);

  const [lines, setLines] =
    useState<GoodsReceiptDraftLine[]>([]);

  const [search, setSearch] =
    useState("");

  const [scannerActive, setScannerActive] =
    useState(true);

  const [selectedLineId, setSelectedLineId] =
    useState<string | null>(null);

  const [
    pendingUnknownBarcode,
    setPendingUnknownBarcode,
  ] = useState<string | null>(null);

  const [notification, setNotification] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState<ReceiptForm>({
      receiptDate: getToday(),
      packingSlipNumber: "",
      receivedBy: "",
      notes: "",
    });

  useEffect(() => {
    const openOrders =
      getOpenGoodsReceiptOrders();

    setOrders(openOrders);

    const resolvedOrderId =
      initialOrderId &&
      openOrders.some(
        (order) =>
          order.id === initialOrderId,
      )
        ? initialOrderId
        : "";

    setSelectedOrderId(
      resolvedOrderId,
    );
  }, [initialOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setLines([]);
      setSelectedLineId(null);
      return;
    }

    const draftLines =
      getGoodsReceiptDraftLines(
        selectedOrderId,
      );

    setLines(draftLines);
    setSelectedLineId(
      draftLines[0]?.id ?? null,
    );
    setSearch("");
    setPendingUnknownBarcode(null);
    setError(null);
  }, [selectedOrderId]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setNotification(null);
      },
      2800,
    );

    return () =>
      window.clearTimeout(timeout);
  }, [notification]);

  const selectedOrder = useMemo(
    () =>
      selectedOrderId
        ? getPurchaseOrderForReceipt(
            selectedOrderId,
          )
        : null,
    [selectedOrderId],
  );

  const selectedLine = useMemo(
    () =>
      lines.find(
        (line) =>
          line.id === selectedLineId,
      ) ?? null,
    [lines, selectedLineId],
  );

  const filteredLines = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return lines;
    }

    return lines.filter((line) => {
      const settings =
        line.barcodeSettings;

      return [
        line.productName,
        line.productCode,
        line.sku,
        line.color,
        line.size,
        settings?.ean,
        settings?.internalBarcode,
        settings?.supplierBarcode,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalizedSearch),
      );
    });
  }, [lines, search]);

  const totalQuantity = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + line.receiveQuantity,
        0,
      ),
    [lines],
  );

  const totalValue = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total +
          line.receiveQuantity *
            line.purchasePrice,
        0,
      ),
    [lines],
  );

  function updateQuantity(
    lineId: string,
    quantity: number,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              receiveQuantity:
                Math.min(
                  line.remainingQuantity,
                  Math.max(
                    0,
                    Math.floor(
                      quantity || 0,
                    ),
                  ),
                ),
            }
          : line,
      ),
    );
  }

  function addQuantity(
    lineId: string,
    quantity: number,
  ) {
    const line = lines.find(
      (item) => item.id === lineId,
    );

    if (!line) {
      return;
    }

    updateQuantity(
      lineId,
      line.receiveQuantity + quantity,
    );
  }

  function fillAllRemaining() {
    setLines((current) =>
      current.map((line) => ({
        ...line,
        receiveQuantity:
          line.remainingQuantity,
      })),
    );
  }

  function clearAll() {
    setLines((current) =>
      current.map((line) => ({
        ...line,
        receiveQuantity: 0,
      })),
    );
  }

  function handleBarcodeScan(
    barcode: string,
  ) {
    if (!selectedOrderId) {
      throw new Error(
        "Selecteer eerst een inkooporder.",
      );
    }

    const result =
      findGoodsReceiptLineByBarcode(
        selectedOrderId,
        barcode,
      );

    if (result.result === "UNKNOWN") {
      setPendingUnknownBarcode(
        barcode,
      );

      throw new Error(
        `Barcode ${barcode} is nog niet bekend. Selecteer een regel om deze te koppelen.`,
      );
    }

    if (
      result.result === "NOT_ON_ORDER"
    ) {
      throw new Error(
        "Deze barcode hoort niet bij een openstaande regel van deze inkooporder.",
      );
    }

    const line = result.line;

    if (!line) {
      throw new Error(
        "De orderregel kon niet worden gevonden.",
      );
    }

    setSelectedLineId(line.id);
    addQuantity(line.id, 1);

    registerBarcodeScan({
      barcode,
      productId: line.productId,
      variantId: line.variantId,
      context: "PURCHASE_RECEIPT",
      referenceId: selectedOrderId,
      referenceNumber:
        line.purchaseOrderNumber,
      quantity: 1,
      source: "SCANNER",
      scannedBy:
        form.receivedBy || "Magazijn",
    });

    setNotification(
      `${line.sku}: aantal verhoogd met 1.`,
    );
  }

  function assignPendingBarcode() {
    if (
      !pendingUnknownBarcode ||
      !selectedLine
    ) {
      setError(
        "Selecteer eerst de juiste orderregel.",
      );
      return;
    }

    try {
      const settings =
        assignUnknownBarcodeToVariant(
          pendingUnknownBarcode,
          selectedLine.productId,
          selectedLine.variantId,
          "SUPPLIER",
        );

      setLines((current) =>
        current.map((line) =>
          line.id === selectedLine.id
            ? {
                ...line,
                barcodeSettings: settings,
              }
            : line,
        ),
      );

      registerBarcodeScan({
        barcode:
          pendingUnknownBarcode,
        productId:
          selectedLine.productId,
        variantId:
          selectedLine.variantId,
        context:
          "PURCHASE_RECEIPT",
        referenceId:
          selectedOrderId,
        referenceNumber:
          selectedLine.purchaseOrderNumber,
        quantity: 1,
        source: "SCANNER",
        scannedBy:
          form.receivedBy ||
          "Magazijn",
      });

      addQuantity(
        selectedLine.id,
        1,
      );

      setNotification(
        `Barcode gekoppeld aan ${selectedLine.sku}.`,
      );

      setPendingUnknownBarcode(null);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Barcode koppelen is niet gelukt.",
      );
    }
  }

  function processReceipt() {
    if (!selectedOrderId) {
      setError(
        "Selecteer een inkooporder.",
      );
      return;
    }

    if (totalQuantity <= 0) {
      setError(
        "Vul minimaal één ontvangen aantal in.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = createGoodsReceipt({
        purchaseOrderId:
          selectedOrderId,
        receiptDate:
          form.receiptDate,
        packingSlipNumber:
          form.packingSlipNumber,
        receivedBy:
          form.receivedBy,
        notes: form.notes,
        quantitiesByLineId:
          Object.fromEntries(
            lines.map((line) => [
              line.id,
              line.receiveQuantity,
            ]),
          ),
      });

      router.push(
        `/inkoop/${result.order.id}`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Ontvangst verwerken is niet gelukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/ontvangsten">
          Ontvangsten
        </Link>
        <span>›</span>
        <span>Nieuwe ontvangst</span>
      </div>

      <PageHeader
        eyebrow="Warehouse"
        title="Nieuwe ontvangst"
        description="Ontvang handmatig, via zoeken of met een barcodescanner."
        action={
          <div className={styles.headerActions}>
            <Link
              href="/ontvangsten"
              className="button button-secondary"
            >
              Annuleren
            </Link>

            <button
              type="button"
              className="button button-primary"
              disabled={
                saving ||
                totalQuantity <= 0
              }
              onClick={processReceipt}
            >
              {saving
                ? "Verwerken..."
                : "Ontvangst verwerken"}
            </button>
          </div>
        }
      />

      {notification && (
        <div
          className={styles.notification}
        >
          <span>✓</span>
          {notification}
        </div>
      )}

      {error && (
        <div
          className={styles.errorBanner}
        >
          <span>!</span>
          <div>{error}</div>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.layout}>
        <main className={styles.mainColumn}>
          <section className="content-card">
            <div
              className={
                styles.sectionHeader
              }
            >
              <div>
                <h2>
                  1. Selecteer inkooporder
                </h2>

                <p>
                  Alleen orders met openstaande
                  aantallen worden getoond.
                </p>
              </div>
            </div>

            <div
              className={
                styles.orderSelection
              }
            >
              <select
                value={selectedOrderId}
                onChange={(event) =>
                  setSelectedOrderId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Selecteer een inkooporder
                </option>

                {orders.map((order) => (
                  <option
                    key={order.id}
                    value={order.id}
                  >
                    {order.orderNumber} ·{" "}
                    {order.supplierName} ·{" "}
                    {order.remainingQuantity}{" "}
                    open
                  </option>
                ))}
              </select>
            </div>

            {selectedOrder && (
              <div
                className={
                  styles.orderSummary
                }
              >
                <div>
                  <span>Leverancier</span>
                  <strong>
                    {
                      selectedOrder.supplierName
                    }
                  </strong>
                </div>

                <div>
                  <span>Ordernummer</span>
                  <strong>
                    {
                      selectedOrder.orderNumber
                    }
                  </strong>
                </div>

                <div>
                  <span>Collectie</span>
                  <strong>
                    {selectedOrder.collectionCode ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Verwachte levering
                  </span>
                  <strong>
                    {selectedOrder.expectedDeliveryDate ||
                      "—"}
                  </strong>
                </div>
              </div>
            )}
          </section>

          {selectedOrder && (
            <>
              <section className="content-card">
                <div
                  className={
                    styles.sectionHeader
                  }
                >
                  <div>
                    <h2>
                      2. Scan of zoek artikel
                    </h2>

                    <p>
                      Scannen is optioneel. Alle
                      aantallen blijven handmatig
                      aanpasbaar.
                    </p>
                  </div>

                  <label
                    className={
                      styles.scannerToggle
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        scannerActive
                      }
                      onChange={(event) =>
                        setScannerActive(
                          event.target
                            .checked,
                        )
                      }
                    />

                    Scanner actief
                  </label>
                </div>

                <div
                  className={
                    styles.scannerArea
                  }
                >
                  <BarcodeScannerInput
                    active={scannerActive}
                    onScan={
                      handleBarcodeScan
                    }
                    onUnknownBarcode={
                      setPendingUnknownBarcode
                    }
                    placeholder="Scan EAN, interne barcode of leveranciersbarcode..."
                  />
                </div>

                {pendingUnknownBarcode && (
                  <div
                    className={
                      styles.unknownBarcode
                    }
                  >
                    <div>
                      <strong>
                        Onbekende barcode
                      </strong>

                      <span>
                        {
                          pendingUnknownBarcode
                        }
                      </span>

                      <p>
                        Selecteer hieronder de
                        juiste variant en koppel
                        de barcode.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        !selectedLine
                      }
                      onClick={
                        assignPendingBarcode
                      }
                    >
                      Koppel aan geselecteerde
                      regel
                    </button>
                  </div>
                )}

                <div
                  className={
                    styles.manualSearch
                  }
                >
                  <span>⌕</span>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Zoek handmatig op artikel, SKU, kleur, maat of barcode..."
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              </section>

              <section className="content-card">
                <div
                  className={
                    styles.linesToolbar
                  }
                >
                  <div>
                    <strong>
                      3. Controleer aantallen
                    </strong>

                    <span>
                      {filteredLines.length} open
                      orderregels
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={clearAll}
                    >
                      Alles op 0
                    </button>

                    <button
                      type="button"
                      onClick={
                        fillAllRemaining
                      }
                    >
                      Alles openstaand
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table
                    className={
                      styles.linesTable
                    }
                  >
                    <thead>
                      <tr>
                        <th>Artikel</th>
                        <th>Variant</th>
                        <th>Barcode</th>
                        <th>Besteld</th>
                        <th>Eerder</th>
                        <th>Open</th>
                        <th>Nu ontvangen</th>
                        <th>Snelle invoer</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredLines.map(
                        (line) => {
                          const settings =
                            line.barcodeSettings;

                          const isSelected =
                            selectedLineId ===
                            line.id;

                          return (
                            <tr
                              key={line.id}
                              className={
                                isSelected
                                  ? styles.selectedLine
                                  : undefined
                              }
                              onClick={() =>
                                setSelectedLineId(
                                  line.id,
                                )
                              }
                            >
                              <td>
                                <strong>
                                  {
                                    line.productName
                                  }
                                </strong>

                                <span>
                                  {
                                    line.productCode
                                  }
                                </span>
                              </td>

                              <td>
                                <strong>
                                  {line.sku}
                                </strong>

                                <span>
                                  {line.color} ·{" "}
                                  {line.size}
                                </span>
                              </td>

                              <td>
                                {settings?.ean ||
                                  settings?.internalBarcode ||
                                  settings?.supplierBarcode ||
                                  "Geen barcode"}
                              </td>

                              <td>
                                {
                                  line.orderedQuantity
                                }
                              </td>

                              <td>
                                {
                                  line.previouslyReceivedQuantity
                                }
                              </td>

                              <td>
                                <strong>
                                  {
                                    line.remainingQuantity
                                  }
                                </strong>
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  max={
                                    line.remainingQuantity
                                  }
                                  value={
                                    line.receiveQuantity
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateQuantity(
                                      line.id,
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <div
                                  className={
                                    styles.quickQuantity
                                  }
                                >
                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {
                                      event.stopPropagation();
                                      addQuantity(
                                        line.id,
                                        1,
                                      );
                                    }}
                                  >
                                    +1
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {
                                      event.stopPropagation();
                                      addQuantity(
                                        line.id,
                                        settings?.unitsPerPack ??
                                          1,
                                      );
                                    }}
                                  >
                                    +
                                    {settings?.unitsPerPack ??
                                      1}{" "}
                                    verpakking
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {
                                      event.stopPropagation();
                                      addQuantity(
                                        line.id,
                                        settings?.unitsPerCarton ??
                                          1,
                                      );
                                    }}
                                  >
                                    +
                                    {settings?.unitsPerCarton ??
                                      1}{" "}
                                    doos
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {
                                      event.stopPropagation();
                                      updateQuantity(
                                        line.id,
                                        line.remainingQuantity,
                                      );
                                    }}
                                  >
                                    Alles
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>

        <aside className={styles.sideColumn}>
          <section className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">
                Ontvangstgegevens
              </h2>
            </div>

            <div
              className={
                styles.receiptForm
              }
            >
              <label>
                <span>
                  Ontvangstdatum
                </span>

                <input
                  type="date"
                  value={form.receiptDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      receiptDate:
                        event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>
                  Pakbonnummer
                </span>

                <input
                  type="text"
                  value={
                    form.packingSlipNumber
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      packingSlipNumber:
                        event.target.value,
                    }))
                  }
                  placeholder="Bijv. PB-10294"
                />
              </label>

              <label>
                <span>
                  Ontvangen door
                </span>

                <input
                  type="text"
                  value={form.receivedBy}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      receivedBy:
                        event.target.value,
                    }))
                  }
                  placeholder="Naam medewerker"
                />
              </label>

              <label>
                <span>Notitie</span>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes:
                        event.target.value,
                    }))
                  }
                  placeholder="Afwijkingen, schade of opmerkingen..."
                />
              </label>
            </div>
          </section>

          <section className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">
                Samenvatting
              </h2>
            </div>

            <dl
              className={
                styles.summaryList
              }
            >
              <div>
                <dt>Aantal regels</dt>
                <dd>
                  {
                    lines.filter(
                      (line) =>
                        line.receiveQuantity >
                        0,
                    ).length
                  }
                </dd>
              </div>

              <div>
                <dt>Totaal stuks</dt>
                <dd>{totalQuantity}</dd>
              </div>

              <div>
                <dt>Ontvangstwaarde</dt>
                <dd>
                  {formatCurrency(
                    totalValue,
                    selectedOrder?.currency ??
                      "EUR",
                  )}
                </dd>
              </div>
            </dl>

            <div
              className={
                styles.sideAction
              }
            >
              <button
                type="button"
                disabled={
                  saving ||
                  totalQuantity <= 0
                }
                onClick={processReceipt}
              >
                {saving
                  ? "Verwerken..."
                  : "Ontvangst verwerken"}
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

export default function NewGoodsReceiptPage() {
  return (
    <Suspense fallback={<div />}>
      <NewGoodsReceiptContent />
    </Suspense>
  );
}
