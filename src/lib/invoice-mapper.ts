import type { Invoice } from "@/lib/invoices";

type Row = Record<string, unknown>;

function rec(value: unknown): Row {
  return value && typeof value === "object"
    ? value as Row
    : {};
}

function num(value: unknown) {
  return Number.isFinite(Number(value))
    ? Number(value)
    : 0;
}

export function invoiceFromRow(
  row: Row,
): Invoice {
  const profile = rec(row.profile);

  return {
    id: String(row.id ?? ""),
    invoiceNumber: String(
      row.invoice_number ?? "",
    ),

    salesOrderId: String(
      row.sales_order_id ?? "",
    ),

    salesOrderNumber: String(
      profile.salesOrderNumber ?? "",
    ),

    customerId: String(
      row.customer_id ?? "",
    ),

    customerNumber: "",
    customerName: String(
      profile.customerName ?? "",
    ),

    customerCountry: String(
      profile.customerCountry ?? "Nederland",
    ),

    customerVatNumber: String(
      profile.customerVatNumber ?? "",
    ),

    customerVatNumberStatus: String(
      profile.customerVatNumberStatus ?? "Niet gecontroleerd",
    ),

    vatInvoiceText: String(
      profile.vatInvoiceText ?? "",
    ),

    contactPerson: "",
    email: "",
    city: "",

    invoiceDate: String(
      row.invoice_date ?? "",
    ),

    dueDate: String(
      row.due_date ?? "",
    ),

    paymentDays: 30,
    paymentDiscountPercentage: 0,
    paymentDiscountDays: 0,

    status:
      row.status === "Betaald" ||
      row.status === "Deels betaald" ||
      row.status === "Vervallen" ||
      row.status === "Definitief" ||
      row.status === "Verzonden" ||
      row.status === "Gecrediteerd"
        ? row.status
        : "Concept",

    subtotalBeforeDiscount: 0,
    discountAmount: 0,
    subtotal: num(row.subtotal),

    vatRate: 21,
    vatAmount: num(row.vat),
    vatSummary: [],

    total: num(row.total),

    notes: "",

    lines: Array.isArray(row.invoice_lines)
      ? row.invoice_lines.map((line) => {
          const l = rec(line);
          const p = rec(l.profile);

          return {
            id: String(l.id ?? ""),
            productId: String(
              p.productId ?? "",
            ),
            productCode: String(
              p.productCode ??
              p.code ??
              p.product_code ??
              l.productCode ??
              "",
            ),
            productName: String(
              p.productName ?? "",
            ),
            variantId: String(
              l.variant_id ?? "",
            ),
            sku: String(
              p.sku ?? "",
            ),
            color: String(
              p.color ?? "",
            ),
            size: String(
              p.size ?? "",
            ),
            quantity: num(l.quantity),
            unitPrice: num(l.unit_price),
            discountPercentage: num(
              l.discount_percentage,
            ),
            lineSubtotal: num(
              l.line_total,
            ),
            vatCode:
              p.vatCode === "0V" ||
              p.vatCode === "2V"
                ? p.vatCode
                : "2V",
            vatRate: 21,
            vatAmount: 0,
            vatSummary: [],
          };
        })
      : [],

    payments: Array.isArray(row.invoice_payments)
      ? row.invoice_payments.map((p) => ({
          ...p,
          amount: num(
            (p as Row).amount,
          ),
        }))
      : [],

    sentAt: null,
    createdAt: String(
      row.created_at ?? "",
    ),
    updatedAt: String(
      row.updated_at ?? "",
    ),
  };
}
