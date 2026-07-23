import {
  getPurchaseOrders,
  getPurchaseOrderTotals,
  getPurchaseReceipts,
  receivePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type PurchaseReceipt,
} from "@/lib/purchasing";
import {
  getBarcodeSettingsForVariant,
  lookupVariantByBarcode,
  type VariantBarcodeSettings,
} from "@/lib/barcodes";

export type GoodsReceiptOrderRow = {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  supplierReference: string;
  collectionCode: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: PurchaseOrder["status"];
  currency: string;
  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  remainingValue: number;
  progress: number;
  lineCount: number;
  overdue: boolean;
};

export type GoodsReceiptHistoryRow = {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  receiptDate: string;
  packingSlipNumber: string;
  receivedBy: string;
  notes: string;
  quantity: number;
  lineCount: number;
  createdAt: string;
};

export type GoodsReceiptDraftLine = {
  id: string;
  purchaseOrderLineId: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;

  productId: string;
  variantId: string;

  productCode: string;
  productName: string;
  sku: string;
  color: string;
  size: string;

  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  remainingQuantity: number;
  receiveQuantity: number;

  purchasePrice: number;

  barcodeSettings: VariantBarcodeSettings | null;
};

export type CreateGoodsReceiptInput = {
  purchaseOrderId: string;
  receiptDate: string;
  packingSlipNumber: string;
  receivedBy: string;
  notes: string;
  quantitiesByLineId: Record<string, number>;
};

export type GoodsReceiptDashboard = {
  openOrders: number;
  partialOrders: number;
  overdueOrders: number;
  incomingQuantity: number;
  openPurchaseValue: number;
  receiptsToday: number;
  receivedToday: number;
  totalReceipts: number;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function isOrderOverdue(order: PurchaseOrder) {
  if (
    !order.expectedDeliveryDate ||
    order.status === "Ontvangen" ||
    order.status === "Geannuleerd" ||
    order.status === "Concept"
  ) {
    return false;
  }

  return order.expectedDeliveryDate < getToday();
}

export function getOpenGoodsReceiptOrders() {
  return getPurchaseOrders()
    .filter(
      (order) =>
        order.status === "Besteld" ||
        order.status === "Deels ontvangen",
    )
    .map((order): GoodsReceiptOrderRow => {
      const totals = getPurchaseOrderTotals(order);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        supplierReference: order.supplierReference,
        collectionCode: order.collectionCode,
        orderDate: order.orderDate,
        expectedDeliveryDate:
          order.expectedDeliveryDate,
        status: order.status,
        currency: order.currency,
        orderedQuantity: totals.orderedQuantity,
        receivedQuantity: totals.receivedQuantity,
        remainingQuantity: totals.remainingQuantity,
        remainingValue: totals.remainingValue,
        progress: totals.receiptProgress,
        lineCount: order.lines.length,
        overdue: isOrderOverdue(order),
      };
    })
    .sort((first, second) => {
      if (first.overdue !== second.overdue) {
        return first.overdue ? -1 : 1;
      }

      return first.expectedDeliveryDate.localeCompare(
        second.expectedDeliveryDate,
      );
    });
}

export function getGoodsReceiptHistory() {
  return getPurchaseReceipts()
    .map((receipt): GoodsReceiptHistoryRow => {
      const quantity = receipt.lines.reduce(
        (total, line) => total + line.quantity,
        0,
      );

      return {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        purchaseOrderId: receipt.purchaseOrderId,
        purchaseOrderNumber:
          receipt.purchaseOrderNumber,
        supplierId: receipt.supplierId,
        supplierName: receipt.supplierName,
        receiptDate: receipt.receiptDate,
        packingSlipNumber:
          receipt.packingSlipNumber,
        receivedBy: receipt.receivedBy,
        notes: receipt.notes,
        quantity,
        lineCount: receipt.lines.length,
        createdAt: receipt.createdAt,
      };
    })
    .sort((first, second) =>
      second.createdAt.localeCompare(first.createdAt),
    );
}

export function getGoodsReceiptDashboard(): GoodsReceiptDashboard {
  const openOrders = getOpenGoodsReceiptOrders();
  const receipts = getGoodsReceiptHistory();
  const today = getToday();

  const receiptsToday = receipts.filter(
    (receipt) => receipt.receiptDate === today,
  );

  return {
    openOrders: openOrders.length,

    partialOrders: openOrders.filter(
      (order) => order.status === "Deels ontvangen",
    ).length,

    overdueOrders: openOrders.filter(
      (order) => order.overdue,
    ).length,

    incomingQuantity: openOrders.reduce(
      (total, order) =>
        total + order.remainingQuantity,
      0,
    ),

    openPurchaseValue: openOrders.reduce(
      (total, order) =>
        total + order.remainingValue,
      0,
    ),

    receiptsToday: receiptsToday.length,

    receivedToday: receiptsToday.reduce(
      (total, receipt) =>
        total + receipt.quantity,
      0,
    ),

    totalReceipts: receipts.length,
  };
}

export function getPurchaseOrderForReceipt(
  purchaseOrderId: string,
) {
  return (
    getPurchaseOrders().find(
      (order) => order.id === purchaseOrderId,
    ) ?? null
  );
}

function createDraftLine(
  order: PurchaseOrder,
  line: PurchaseOrderLine,
): GoodsReceiptDraftLine {
  const remainingQuantity = Math.max(
    0,
    line.orderedQuantity -
      line.receivedQuantity,
  );

  return {
    id: line.id,
    purchaseOrderLineId: line.id,
    purchaseOrderId: order.id,
    purchaseOrderNumber: order.orderNumber,

    productId: line.productId,
    variantId: line.variantId,

    productCode: line.productCode,
    productName: line.productName,
    sku: line.sku,
    color: line.color,
    size: line.size,

    orderedQuantity: line.orderedQuantity,
    previouslyReceivedQuantity:
      line.receivedQuantity,
    remainingQuantity,
    receiveQuantity: 0,

    purchasePrice: line.purchasePrice,

    barcodeSettings:
      getBarcodeSettingsForVariant(
        line.variantId,
      ),
  };
}

export function getGoodsReceiptDraftLines(
  purchaseOrderId: string,
) {
  const order = getPurchaseOrderForReceipt(
    purchaseOrderId,
  );

  if (!order) {
    return [];
  }

  return order.lines
    .map((line) =>
      createDraftLine(order, line),
    )
    .filter(
      (line) => line.remainingQuantity > 0,
    );
}

export function searchGoodsReceiptDraftLines(
  purchaseOrderId: string,
  search: string,
) {
  const normalizedSearch = search
    .trim()
    .toLowerCase();

  const lines = getGoodsReceiptDraftLines(
    purchaseOrderId,
  );

  if (!normalizedSearch) {
    return lines;
  }

  return lines.filter((line) => {
    const settings = line.barcodeSettings;

    return [
      line.productCode,
      line.productName,
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
}

export function findGoodsReceiptLineByBarcode(
  purchaseOrderId: string,
  barcode: string,
) {
  const lookup =
    lookupVariantByBarcode(barcode);

  if (!lookup) {
    return {
      result: "UNKNOWN" as const,
      line: null,
      lookup: null,
    };
  }

  const line = getGoodsReceiptDraftLines(
    purchaseOrderId,
  ).find(
    (item) =>
      item.variantId === lookup.variant.id,
  );

  if (!line) {
    return {
      result: "NOT_ON_ORDER" as const,
      line: null,
      lookup,
    };
  }

  return {
    result: "FOUND" as const,
    line,
    lookup,
  };
}

export function createGoodsReceipt(
  input: CreateGoodsReceiptInput,
) {
  const order = getPurchaseOrderForReceipt(
    input.purchaseOrderId,
  );

  if (!order) {
    throw new Error(
      "De geselecteerde inkooporder is niet gevonden.",
    );
  }

  if (
    order.status !== "Besteld" &&
    order.status !== "Deels ontvangen"
  ) {
    throw new Error(
      "Voor deze inkooporder kan geen ontvangst meer worden geboekt.",
    );
  }

  const validQuantities =
    Object.fromEntries(
      order.lines.map((line) => {
        const remainingQuantity = Math.max(
          0,
          line.orderedQuantity -
            line.receivedQuantity,
        );

        const requestedQuantity = Math.max(
          0,
          Math.floor(
            input.quantitiesByLineId[
              line.id
            ] ?? 0,
          ),
        );

        return [
          line.id,
          Math.min(
            requestedQuantity,
            remainingQuantity,
          ),
        ];
      }),
    );

  const totalQuantity = Object.values(
    validQuantities,
  ).reduce(
    (total, quantity) =>
      total + quantity,
    0,
  );

  if (totalQuantity <= 0) {
    throw new Error(
      "Vul minimaal één ontvangen aantal in.",
    );
  }

  return receivePurchaseOrder(order.id, {
    receivedByLine: validQuantities,
    receiptDate: input.receiptDate,
    packingSlipNumber:
      input.packingSlipNumber,
    receivedBy: input.receivedBy,
    notes: input.notes,
  });
}

export function getReceiptById(
  receiptId: string,
): PurchaseReceipt | null {
  return (
    getPurchaseReceipts().find(
      (receipt) => receipt.id === receiptId,
    ) ?? null
  );
}