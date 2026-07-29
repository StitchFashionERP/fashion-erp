"use client";

import {
  getInvoices,
  saveInvoices,
  type Invoice,
} from "@/lib/invoices";
import {
  getStoredProducts,
  saveProducts,
} from "@/lib/articles";
import {
  getWarehouseLocations,
  getWarehouseStockPositions,
  type WarehouseStockPosition,
} from "@/lib/warehouse";
import {
  getSharedStateValue,
  setSharedStateValue,
} from "@/lib/shared-state-client";

export type ReturnStatus =
  | "Aangemeld"
  | "Ontvangen"
  | "Gecontroleerd"
  | "Gecrediteerd"
  | "Afgerond";

export type ReturnReason =
  | "Te klein"
  | "Te groot"
  | "Kleur wijkt af"
  | "Beschadigd"
  | "Productiefout"
  | "Verkeerd geleverd"
  | "Verkeerd besteld"
  | "Anders";

export type ReturnDisposition =
  | "Nog beoordelen"
  | "Verkoopbaar"
  | "Outlet"
  | "Reparatie"
  | "Afkeur";

export type ReturnLine = {
  id: string;
  invoiceLineId: string;
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  invoicedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  discountPercentage: number;
  reason: ReturnReason;
  disposition: ReturnDisposition;
  warehouseLocationId: string;
  checked: boolean;
};

export type CustomerReturn = {
  id: string;
  rmaNumber: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  status: ReturnStatus;
  notes: string;
  receivedAt: string;
  checkedAt: string;
  creditNoteId: string;
  lines: ReturnLine[];
  createdAt: string;
  updatedAt: string;
};

export type CreditNoteStatus =
  | "Concept"
  | "Definitief"
  | "Geëxporteerd";

export type CreditNoteLine = {
  id: string;
  returnLineId: string;
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  lineSubtotal: number;
};

export type CreditNote = {
  id: string;
  creditNumber: string;
  returnId: string;
  rmaNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  creditDate: string;
  status: CreditNoteStatus;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  reason: string;
  lines: CreditNoteLine[];
  exactExportStatus:
    | "Niet geëxporteerd"
    | "In wachtrij"
    | "Geëxporteerd"
    | "Fout"
    | "Geblokkeerd";
  exactCreditInvoiceId: string;
  exactEntryId: string;
  exactLastError: string;
  exactAttempts: number;
  exactExportedAt: string;
  createdAt: string;
  updatedAt: string;
};

const returnsKey =
  "stitch-erp-customer-returns-v1";
const creditNotesKey =
  "stitch-erp-credit-notes-v1";
const warehousePositionsKey =
  "stitch-erp-warehouse-positions-v1";

export const returnsSharedStateKeys = [
  returnsKey,
  creditNotesKey,
  warehousePositionsKey,
] as const;

function now() {
  return new Date().toISOString();
}

function today() {
  return now().slice(0, 10);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function readArray<T>(key: string): T[] {
  return getSharedStateValue<T[]>(key, []);
}

function saveArray<T>(key: string, items: T[]) {
  setSharedStateValue(key, items);
}

function nextNumber(
  prefix: "RMA" | "C",
  existing: string[],
) {
  const year = new Date().getFullYear();
  const pattern =
    prefix === "RMA"
      ? new RegExp(`^RMA-${year}-(\\d+)$`)
      : new RegExp(`^C${year}-(\\d+)$`);

  const highest = existing.reduce(
    (current, value) => {
      const match = value.match(pattern);
      return match
        ? Math.max(current, Number(match[1]))
        : current;
    },
    0,
  );

  return prefix === "RMA"
    ? `RMA-${year}-${String(highest + 1).padStart(
        5,
        "0",
      )}`
    : `C${year}-${String(highest + 1).padStart(
        5,
        "0",
      )}`;
}

export function getCustomerReturns() {
  return readArray<CustomerReturn>(returnsKey).sort(
    (first, second) =>
      second.createdAt.localeCompare(first.createdAt),
  );
}

export function getCustomerReturnById(id: string) {
  return (
    getCustomerReturns().find(
      (item) => item.id === id,
    ) ?? null
  );
}

export function createReturnFromInvoice(input: {
  invoiceId: string;
  notes?: string;
  lineQuantities: Record<string, number>;
  reasons: Record<string, ReturnReason>;
}) {
  const invoice = getInvoices().find(
    (item) => item.id === input.invoiceId,
  );

  if (!invoice) {
    throw new Error("Factuur niet gevonden.");
  }

  const returns = getCustomerReturns();

  const lines: ReturnLine[] = invoice.lines
    .map((line) => {
      const quantity = Math.min(
        line.quantity,
        Math.max(
          0,
          Math.floor(
            input.lineQuantities[line.id] ?? 0,
          ),
        ),
      );

      return {
        id: createId("return-line"),
        invoiceLineId: line.id,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        variantId: line.variantId,
        sku: line.sku,
        color: line.color,
        size: line.size,
        invoicedQuantity: line.quantity,
        returnQuantity: quantity,
        unitPrice: line.unitPrice,
        discountPercentage:
          line.discountPercentage,
        reason:
          input.reasons[line.id] || "Anders",
        disposition:
          "Nog beoordelen" as ReturnDisposition,
        warehouseLocationId: "",
        checked: false,
      };
    })
    .filter((line) => line.returnQuantity > 0);

  if (lines.length === 0) {
    throw new Error(
      "Vul minimaal één retouraantal in.",
    );
  }

  const timestamp = now();

  const customerReturn: CustomerReturn = {
    id: createId("return"),
    rmaNumber: nextNumber(
      "RMA",
      returns.map((item) => item.rmaNumber),
    ),
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    salesOrderId: invoice.salesOrderId,
    salesOrderNumber:
      invoice.salesOrderNumber,
    status: "Aangemeld",
    notes: input.notes?.trim() || "",
    receivedAt: "",
    checkedAt: "",
    creditNoteId: "",
    lines,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  saveArray(returnsKey, [
    customerReturn,
    ...returns,
  ]);

  return customerReturn;
}

export function markReturnReceived(id: string) {
  return updateReturn(id, {
    status: "Ontvangen",
    receivedAt: now(),
  });
}

export function updateReturnLine(
  returnId: string,
  lineId: string,
  changes: Partial<ReturnLine>,
) {
  const returns = getCustomerReturns().map(
    (customerReturn) =>
      customerReturn.id === returnId
        ? {
            ...customerReturn,
            lines: customerReturn.lines.map((line) =>
              line.id === lineId
                ? { ...line, ...changes }
                : line,
            ),
            updatedAt: now(),
          }
        : customerReturn,
  );

  saveArray(returnsKey, returns);

  return (
    returns.find((item) => item.id === returnId) ??
    null
  );
}

function updateReturn(
  id: string,
  changes: Partial<CustomerReturn>,
) {
  const returns = getCustomerReturns().map(
    (item) =>
      item.id === id
        ? {
            ...item,
            ...changes,
            updatedAt: now(),
          }
        : item,
  );

  saveArray(returnsKey, returns);

  return (
    returns.find((item) => item.id === id) ?? null
  );
}

function addStockToWarehouse(input: {
  productId: string;
  variantId: string;
  locationId: string;
  quantity: number;
}) {
  const positions =
    getWarehouseStockPositions();

  const index = positions.findIndex(
    (position) =>
      position.variantId === input.variantId &&
      position.locationId === input.locationId,
  );

  if (index >= 0) {
    positions[index] = {
      ...positions[index],
      quantity:
        positions[index].quantity +
        input.quantity,
      updatedAt: now(),
    };
  } else {
    positions.push({
      id: createId("position"),
      productId: input.productId,
      variantId: input.variantId,
      locationId: input.locationId,
      quantity: input.quantity,
      updatedAt: now(),
    });
  }

  saveArray<WarehouseStockPosition>(
    warehousePositionsKey,
    positions,
  );
}

function updatePhysicalStock(
  variantId: string,
  quantity: number,
) {
  const products = getStoredProducts();

  products.forEach((product) => {
    const variant = product.variants.find(
      (item) => item.id === variantId,
    );

    if (variant) {
      variant.physicalStock += quantity;
      product.updatedAt = now();
    }
  });

  saveProducts(products);
}

export function completeReturnInspection(id: string) {
  const customerReturn =
    getCustomerReturnById(id);

  if (!customerReturn) {
    throw new Error("Retour niet gevonden.");
  }

  if (
    customerReturn.lines.some(
      (line) =>
        line.disposition === "Nog beoordelen",
    )
  ) {
    throw new Error(
      "Beoordeel eerst alle retourregels.",
    );
  }

  customerReturn.lines.forEach((line) => {
    if (
      line.disposition === "Verkoopbaar" ||
      line.disposition === "Outlet" ||
      line.disposition === "Reparatie"
    ) {
      if (!line.warehouseLocationId) {
        throw new Error(
          `Kies een magazijnlocatie voor ${line.sku}.`,
        );
      }

      addStockToWarehouse({
        productId: line.productId,
        variantId: line.variantId,
        locationId: line.warehouseLocationId,
        quantity: line.returnQuantity,
      });

      updatePhysicalStock(
        line.variantId,
        line.returnQuantity,
      );
    }
  });

  return updateReturn(id, {
    status: "Gecontroleerd",
    checkedAt: now(),
    lines: customerReturn.lines.map((line) => ({
      ...line,
      checked: true,
    })),
  });
}

export function getCreditNotes() {
  return readArray<CreditNote>(creditNotesKey).sort(
    (first, second) =>
      second.createdAt.localeCompare(first.createdAt),
  );
}

export function getCreditNoteById(id: string) {
  return (
    getCreditNotes().find(
      (item) => item.id === id,
    ) ?? null
  );
}

export function createCreditNoteFromReturn(
  returnId: string,
) {
  const customerReturn =
    getCustomerReturnById(returnId);

  if (!customerReturn) {
    throw new Error("Retour niet gevonden.");
  }

  if (customerReturn.status !== "Gecontroleerd") {
    throw new Error(
      "Controleer de retour eerst volledig.",
    );
  }

  if (customerReturn.creditNoteId) {
    const existing = getCreditNoteById(
      customerReturn.creditNoteId,
    );

    if (existing) {
      return existing;
    }
  }

  const creditNotes = getCreditNotes();

  const lines: CreditNoteLine[] =
    customerReturn.lines.map((line) => {
      const lineSubtotal =
        line.returnQuantity *
        line.unitPrice *
        (1 - line.discountPercentage / 100);

      return {
        id: createId("credit-line"),
        returnLineId: line.id,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        variantId: line.variantId,
        sku: line.sku,
        color: line.color,
        size: line.size,
        quantity: line.returnQuantity,
        unitPrice: line.unitPrice,
        discountPercentage:
          line.discountPercentage,
        lineSubtotal,
      };
    });

  const subtotal = lines.reduce(
    (total, line) =>
      total + line.lineSubtotal,
    0,
  );

  const vatRate = 21;
  const vatAmount =
    Math.round(subtotal * (vatRate / 100) * 100) /
    100;
  const total =
    Math.round((subtotal + vatAmount) * 100) /
    100;

  const timestamp = now();

  const creditNote: CreditNote = {
    id: createId("credit-note"),
    creditNumber: nextNumber(
      "C",
      creditNotes.map(
        (item) => item.creditNumber,
      ),
    ),
    returnId: customerReturn.id,
    rmaNumber: customerReturn.rmaNumber,
    originalInvoiceId:
      customerReturn.invoiceId,
    originalInvoiceNumber:
      customerReturn.invoiceNumber,
    customerId: customerReturn.customerId,
    customerName:
      customerReturn.customerName,
    creditDate: today(),
    status: "Definitief",
    subtotal,
    vatRate,
    vatAmount,
    total,
    reason: `Credit op ${customerReturn.invoiceNumber} wegens retour ${customerReturn.rmaNumber}`,
    lines,
    exactExportStatus: "In wachtrij",
    exactCreditInvoiceId: "",
    exactEntryId: "",
    exactLastError: "",
    exactAttempts: 0,
    exactExportedAt: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  saveArray(creditNotesKey, [
    creditNote,
    ...creditNotes,
  ]);

  updateReturn(returnId, {
    status: "Gecrediteerd",
    creditNoteId: creditNote.id,
  });

  return creditNote;
}

export function markCreditExported(input: {
  creditNoteId: string;
  exactCreditInvoiceId: string;
  exactEntryId: string;
}) {
  const notes = getCreditNotes().map((item) =>
    item.id === input.creditNoteId
      ? {
          ...item,
          status:
            "Geëxporteerd" as CreditNoteStatus,
          exactExportStatus:
            "Geëxporteerd" as const,
          exactCreditInvoiceId:
            input.exactCreditInvoiceId,
          exactEntryId: input.exactEntryId,
          exactLastError: "",
          exactAttempts:
            item.exactAttempts + 1,
          exactExportedAt: now(),
          updatedAt: now(),
        }
      : item,
  );

  saveArray(creditNotesKey, notes);

  const credit = notes.find(
    (item) => item.id === input.creditNoteId,
  );

  if (credit) {
    updateReturn(credit.returnId, {
      status: "Afgerond",
    });
  }

  return credit ?? null;
}

export function getReturnsDashboard() {
  const returns = getCustomerReturns();
  const credits = getCreditNotes();

  return {
    totalReturns: returns.length,
    awaitingReceipt: returns.filter(
      (item) => item.status === "Aangemeld",
    ).length,
    awaitingInspection: returns.filter(
      (item) => item.status === "Ontvangen",
    ).length,
    awaitingCredit: returns.filter(
      (item) => item.status === "Gecontroleerd",
    ).length,
    completed: returns.filter(
      (item) => item.status === "Afgerond",
    ).length,
    creditValue: credits.reduce(
      (total, item) => total + item.total,
      0,
    ),
  };
}

export const returnReasons: ReturnReason[] = [
  "Te klein",
  "Te groot",
  "Kleur wijkt af",
  "Beschadigd",
  "Productiefout",
  "Verkeerd geleverd",
  "Verkeerd besteld",
  "Anders",
];

export const returnDispositions: ReturnDisposition[] =
  [
    "Nog beoordelen",
    "Verkoopbaar",
    "Outlet",
    "Reparatie",
    "Afkeur",
  ];
