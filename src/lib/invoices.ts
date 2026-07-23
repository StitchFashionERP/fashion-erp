import {
  getCustomers,
} from "@/lib/master-data";
import {
  appendHistoryEventsOnce,
} from "@/lib/history-engine";
import {
  getStoredProducts,
} from "@/lib/articles";
import {
  calculateVatAmount,
  resolveSalesVat,
  validateForeignVatProfile,
  type VatCode,
} from "@/lib/vat-engine";
import {
  getSalesOrderById,
  getSalesOrders,
  getSalesOrderTotals,
  type SalesOrder,
} from "@/lib/sales";

export type InvoiceStatus =
  | "Concept"
  | "Definitief"
  | "Verzonden"
  | "Deels betaald"
  | "Betaald"
  | "Vervallen"
  | "Gecrediteerd";

export type InvoiceLine = {
  id: string;
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
  vatCode: VatCode;
  vatRate: number;
  vatAmount: number;
  vatSummary: Array<{
    vatCode: VatCode;
    vatRate: number;
    taxableAmount: number;
    vatAmount: number;
  }>;
};

export type InvoicePayment = {
  id: string;
  paymentDate: string;
  amount: number;
  method: string;
  reference: string;
  createdAt: string;
};

export type InvoiceVatSummary = {
  vatCode: VatCode;
  vatRate: number;
  taxableAmount: number;
  vatAmount: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;

  customerId: string;
  customerNumber: string;
  customerName: string;
  contactPerson: string;
  email: string;
  city: string;
  customerCountry: string;
  customerVatNumber: string;
  customerVatNumberStatus: string;
  vatInvoiceText: string;

  invoiceDate: string;
  dueDate: string;
  paymentDays: number;
  paymentDiscountPercentage: number;
  paymentDiscountDays: number;
  status: InvoiceStatus;

  subtotalBeforeDiscount: number;
  discountAmount: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  vatSummary: InvoiceVatSummary[];
  total: number;

  notes: string;
  lines: InvoiceLine[];
  payments: InvoicePayment[];

  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const storageKey = "fashion-erp-invoices";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function getNextInvoiceNumber(invoices: Invoice[]) {
  const year = new Date().getFullYear();

  const highest = invoices.reduce((current, invoice) => {
    const match = invoice.invoiceNumber.match(
      new RegExp(`^F${year}-(\\d+)$`),
    );

    if (!match) {
      return current;
    }

    return Math.max(current, Number(match[1]));
  }, 0);

  return `F${year}-${String(highest + 1).padStart(5, "0")}`;
}

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return [];
  }

  try {
    return (JSON.parse(stored) as Invoice[]).map((invoice) => ({
      ...invoice,
      paymentDays: typeof invoice.paymentDays === "number" && invoice.paymentDays > 0 ? invoice.paymentDays : 30,
      paymentDiscountPercentage: typeof invoice.paymentDiscountPercentage === "number" ? Math.max(0, invoice.paymentDiscountPercentage) : 0,
      paymentDiscountDays: typeof invoice.paymentDiscountDays === "number" ? Math.max(0, invoice.paymentDiscountDays) : 0,
      customerCountry:
        invoice.customerCountry || "Nederland",
      customerVatNumber:
        invoice.customerVatNumber || "",
      customerVatNumberStatus:
        invoice.customerVatNumberStatus ||
        "Niet gecontroleerd",
      vatInvoiceText:
        invoice.vatInvoiceText || "",
      vatSummary:
        invoice.vatSummary || [
          {
            vatCode: "2V",
            vatRate:
              typeof invoice.vatRate === "number"
                ? invoice.vatRate
                : 21,
            taxableAmount:
              invoice.subtotal || 0,
            vatAmount:
              invoice.vatAmount || 0,
          },
        ],
      lines: invoice.lines.map((line) => {
        const vatCode = line.vatCode || "2V";
        const vatRate =
          typeof line.vatRate === "number"
            ? line.vatRate
            : 21;
        const vatAmount =
          typeof line.vatAmount === "number"
            ? line.vatAmount
            : calculateVatAmount(
                line.lineSubtotal,
                vatRate,
              );

        return {
          ...line,
          vatCode,
          vatRate,
          vatAmount,
          vatSummary:
            line.vatSummary || [
              {
                vatCode,
                vatRate,
                taxableAmount:
                  line.lineSubtotal || 0,
                vatAmount,
              },
            ],
        };
      }),
    }));
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

export function saveInvoices(invoices: Invoice[]) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(invoices),
  );
}

export function getInvoiceById(id: string) {
  return (
    getInvoices().find((invoice) => invoice.id === id) ??
    null
  );
}

export function getInvoiceBySalesOrderId(
  salesOrderId: string,
) {
  return (
    getInvoices().find(
      (invoice) =>
        invoice.salesOrderId === salesOrderId &&
        invoice.status !== "Gecrediteerd",
    ) ?? null
  );
}

export function getInvoiceableSalesOrders() {
  const invoices = getInvoices();
  const invoicedOrderIds = new Set(
    invoices
      .filter(
        (invoice) => invoice.status !== "Gecrediteerd",
      )
      .map((invoice) => invoice.salesOrderId),
  );

  return getSalesOrders().filter(
    (order) =>
      order.status === "Verzonden" &&
      !invoicedOrderIds.has(order.id),
  );
}

export function createInvoiceFromSalesOrder(
  salesOrderId: string,
) {
  const existingInvoice =
    getInvoiceBySalesOrderId(salesOrderId);

  if (existingInvoice) {
    throw new Error(
      "Voor deze verkooporder bestaat al een factuur.",
    );
  }

  const order = getSalesOrderById(salesOrderId);

  if (!order) {
    throw new Error("Verkooporder niet gevonden.");
  }

  if (order.status !== "Verzonden") {
    throw new Error(
      "Alleen verzonden verkooporders kunnen worden gefactureerd.",
    );
  }

  return createInvoiceFromOrder(order);
}

function createInvoiceFromOrder(order: SalesOrder) {
  const invoices = getInvoices();
  const now = new Date().toISOString();
  const invoiceDate = now.slice(0, 10);
  const orderTotals = getSalesOrderTotals(order);

  const customer =
    getCustomers().find(
      (item) => item.id === order.customerId,
    ) ?? null;

  const customerProfile = {
    country: customer?.country || "Nederland",
    customerType:
      customer?.customerType || "Zakelijk",
    vatNumber: customer?.vatNumber || "",
    vatNumberStatus:
      customer?.vatNumberStatus ||
      "Niet gecontroleerd",
    transactionNature:
      customer?.transactionNature ||
      "Goederen",
  } as const;

  validateForeignVatProfile(customerProfile);

  const products = getStoredProducts();

  const lines: InvoiceLine[] = order.lines.map(
    (line) => {
      const lineSubtotal =
        Math.round(
          line.quantity *
            line.unitPrice *
            (1 -
              line.discountPercentage / 100) *
            100,
        ) / 100;

      const product = products.find(
        (item) => item.id === line.productId,
      );

      const vat = resolveSalesVat(
        product?.vatCode || "2V",
        customerProfile,
      );

      return {
        id: createId("invoice-line"),
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        variantId: line.variantId,
        sku: line.sku,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercentage:
          line.discountPercentage,
        lineSubtotal,
        vatCode: vat.vatCode,
        vatRate: vat.percentage,
        vatAmount: calculateVatAmount(
          lineSubtotal,
          vat.percentage,
        ),
        vatSummary: [
          {
            vatCode: vat.vatCode,
            vatRate: vat.percentage,
            taxableAmount: lineSubtotal,
            vatAmount: calculateVatAmount(
              lineSubtotal,
              vat.percentage,
            ),
          },
        ],
      };
    },
  );

  const vatMap = new Map<
    string,
    {
      vatCode: VatCode;
      vatRate: number;
      taxableAmount: number;
      vatAmount: number;
    }
  >();

  lines.forEach((line) => {
    const current =
      vatMap.get(line.vatCode) || {
        vatCode: line.vatCode,
        vatRate: line.vatRate,
        taxableAmount: 0,
        vatAmount: 0,
      };

    current.taxableAmount =
      Math.round(
        (current.taxableAmount +
          line.lineSubtotal) *
          100,
      ) / 100;

    current.vatAmount =
      Math.round(
        (current.vatAmount +
          line.vatAmount) *
          100,
      ) / 100;

    vatMap.set(line.vatCode, current);
  });

  const vatSummary = [...vatMap.values()];
  const vatAmount = vatSummary.reduce(
    (total, item) =>
      Math.round(
        (total + item.vatAmount) * 100,
      ) / 100,
    0,
  );

  const subtotal = lines.reduce(
    (total, line) =>
      Math.round(
        (total + line.lineSubtotal) * 100,
      ) / 100,
    0,
  );

  const total =
    Math.round(
      (subtotal + vatAmount) * 100,
    ) / 100;

  const vatInvoiceText = lines
    .map((line) =>
      resolveSalesVat(
        line.vatCode,
        customerProfile,
      ).invoiceText,
    )
    .find(Boolean) || "";

  const invoice: Invoice = {
    id: createId("invoice"),
    invoiceNumber:
      getNextInvoiceNumber(invoices),
    salesOrderId: order.id,
    salesOrderNumber: order.orderNumber,

    customerId: order.customerId,
    customerNumber: order.customerNumber,
    customerName: order.customerName,
    contactPerson: order.contactPerson,
    email: order.email,
    city: order.city,
    customerCountry:
      customerProfile.country,
    customerVatNumber:
      customerProfile.vatNumber,
    customerVatNumberStatus:
      customerProfile.vatNumberStatus,
    vatInvoiceText,

    invoiceDate,
    dueDate: addDays(
      invoiceDate,
      order.paymentDays,
    ),
    paymentDays: order.paymentDays,
    paymentDiscountPercentage:
      order.paymentDiscountPercentage,
    paymentDiscountDays:
      order.paymentDiscountDays,
    status: "Concept",

    subtotalBeforeDiscount:
      orderTotals.subtotalBeforeDiscount,
    discountAmount:
      orderTotals.discountAmount,
    subtotal,
    vatRate:
      vatSummary.length === 1
        ? vatSummary[0].vatRate
        : 0,
    vatAmount,
    vatSummary,
    total,

    notes: [
      order.notes,
      vatInvoiceText,
    ]
      .filter(Boolean)
      .join("\n"),
    lines,
    payments: [],

    sentAt: null,
    createdAt: now,
    updatedAt: now,
  };

  saveInvoices([...invoices, invoice]);

  const productsAfter = getStoredProducts();

  appendHistoryEventsOnce(
    "INVOICE_CREATED",
    invoice.id,
    invoice.lines.map((line) => {
      const product = productsAfter.find(
        (item) => item.id === line.productId,
      );
      const variant = product?.variants.find(
        (item) => item.id === line.variantId,
      );

      return {
        eventType: "INVOICE_CREATED",
        referenceId: invoice.id,
        referenceNumber:
          invoice.invoiceNumber,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        variantId: line.variantId,
        sku: line.sku,
        collection: product?.collection || "",
        category: product?.category || "",
        garmentType:
          product?.garmentType ||
          product?.category ||
          "",
        material: product?.material || "",
        fit: product?.fit || "",
        color: line.color,
        colorFamily:
          product?.colorFamily || line.color,
        size: line.size,
        supplierId: "",
        supplierName:
          product?.supplier || "",
        customerId: invoice.customerId,
        customerName:
          invoice.customerName,
        country:
          invoice.customerCountry || "",
        quantity: line.quantity,
        netRevenue: line.lineSubtotal,
        costValue:
          line.quantity *
          (variant?.purchasePrice || 0),
        stockAfter:
          variant?.physicalStock ?? null,
        metadata: {
          vatCode: line.vatCode,
          invoiceStatus: invoice.status,
        },
      };
    }),
  );

  return invoice;
}

export function getInvoicePaidAmount(
  invoice: Invoice,
) {
  return invoice.payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
}

export function getInvoiceOutstandingAmount(
  invoice: Invoice,
) {
  return Math.max(
    0,
    invoice.total - getInvoicePaidAmount(invoice),
  );
}

export function makeInvoiceFinal(id: string) {
  return updateInvoice(id, (invoice) => {
    validateForeignVatProfile({
      country: invoice.customerCountry,
      customerType: "Zakelijk",
      vatNumber: invoice.customerVatNumber,
      vatNumberStatus:
        invoice.customerVatNumberStatus as
          | "Niet gecontroleerd"
          | "Geldig"
          | "Ongeldig",
      transactionNature: "Goederen",
    });

    return {
      ...invoice,
      status: "Definitief",
    };
  });
}

export function markInvoiceSent(id: string) {
  return updateInvoice(id, (invoice) => ({
    ...invoice,
    status:
      invoice.status === "Betaald"
        ? "Betaald"
        : "Verzonden",
    sentAt: new Date().toISOString(),
  }));
}

export function registerInvoicePayment(
  invoiceId: string,
  input: {
    paymentDate: string;
    amount: number;
    method: string;
    reference: string;
  },
) {
  if (input.amount <= 0) {
    throw new Error(
      "Het betaalde bedrag moet groter zijn dan nul.",
    );
  }

  return updateInvoice(invoiceId, (invoice) => {
    const currentOutstanding =
      getInvoiceOutstandingAmount(invoice);

    const paymentAmount = Math.min(
      input.amount,
      currentOutstanding,
    );

    const payments: InvoicePayment[] = [
      ...invoice.payments,
      {
        id: createId("payment"),
        paymentDate: input.paymentDate,
        amount: paymentAmount,
        method: input.method,
        reference: input.reference,
        createdAt: new Date().toISOString(),
      },
    ];

    const paidAmount = payments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );

    const status: InvoiceStatus =
      paidAmount >= invoice.total
        ? "Betaald"
        : "Deels betaald";

    return {
      ...invoice,
      payments,
      status,
    };
  });
}

export function deleteInvoice(id: string) {
  const invoices = getInvoices();
  const invoice = invoices.find(
    (item) => item.id === id,
  );

  if (!invoice) {
    return;
  }

  if (invoice.status !== "Concept") {
    throw new Error(
      "Alleen conceptfacturen kunnen worden verwijderd.",
    );
  }

  saveInvoices(
    invoices.filter((item) => item.id !== id),
  );
}

export function refreshInvoiceStatuses() {
  const invoices = getInvoices();
  const today = new Date().toISOString().slice(0, 10);

  const updated = invoices.map((invoice) => {
    if (
      (invoice.status === "Definitief" ||
        invoice.status === "Verzonden" ||
        invoice.status === "Deels betaald") &&
      invoice.dueDate < today &&
      getInvoiceOutstandingAmount(invoice) > 0
    ) {
      return {
        ...invoice,
        status: "Vervallen" as InvoiceStatus,
      };
    }

    return invoice;
  });

  saveInvoices(updated);

  return updated;
}

function updateInvoice(
  id: string,
  updater: (invoice: Invoice) => Invoice,
) {
  const invoices = getInvoices();
  const invoice = invoices.find(
    (item) => item.id === id,
  );

  if (!invoice) {
    throw new Error("Factuur niet gevonden.");
  }

  const updatedInvoice: Invoice = {
    ...updater(invoice),
    updatedAt: new Date().toISOString(),
  };

  saveInvoices(
    invoices.map((item) =>
      item.id === id ? updatedInvoice : item,
    ),
  );

  return updatedInvoice;
}
