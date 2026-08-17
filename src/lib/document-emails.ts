import { getPaymentConditionText } from "@/lib/pricing-engine";
import {
  getSalesOrderById,
  loadSalesOrderById,
  getSalesOrderTotals,
  type SalesOrder,
} from "@/lib/sales";
import {
  getCustomers,
} from "@/lib/customers";
import {
  getPurchaseOrderById,
  getPurchaseOrderTotals,
  type PurchaseOrder,
} from "@/lib/purchasing";
import {
  getInvoiceById,
  type Invoice,
} from "@/lib/invoices";
import {
  getCreditNoteById,
} from "@/lib/returns";
import {
  getCompanySettings,
} from "@/lib/company-settings";
import {
  getCommunicationSettings,
  type CommunicationDocumentType,
} from "@/lib/communication-settings";
import {
  getSharedStateValue,
  setSharedStateValue,
} from "@/lib/shared-state-client";

function getEmailTemplate(
  documentType: BusinessDocumentType,
) {
  const settings = getCommunicationSettings();

  return settings.documents.find(
    (item) =>
      item.documentType ===
      (documentType as CommunicationDocumentType),
  );
}

export type BusinessDocumentType =
  | "PURCHASE_ORDER"
  | "SALES_ORDER_CONFIRMATION"
  | "PACKING_SLIP"
  | "INVOICE"
  | "CREDIT_NOTE";

export type EmailDeliveryStatus =
  | "DRAFT"
  | "SENDING"
  | "SENT"
  | "FAILED";

export type DocumentEmailAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

export type DocumentEmailDraft = {
  documentType: BusinessDocumentType;
  referenceId: string;
  referenceNumber: string;

  to: string;
  cc: string;
  bcc: string;

  subject: string;
  message: string;

  includeAttachment: boolean;
  attachment?: DocumentEmailAttachment;

  recipientName: string;
  companyName: string;
};

export type DocumentEmailLog = {
  id: string;

  documentType: BusinessDocumentType;
  referenceId: string;
  referenceNumber: string;

  to: string;
  cc: string;
  bcc: string;

  subject: string;
  message: string;

  status: EmailDeliveryStatus;

  providerMessageId: string;
  errorMessage: string;

  attachmentFilename: string;

  sentBy: string;
  sentAt: string;
  createdAt: string;
};

export type SendDocumentEmailInput = {
  draft: DocumentEmailDraft;
  sentBy?: string;
};

export type SendDocumentEmailResult = {
  success: boolean;
  messageId: string;
  error: string;
  log: DocumentEmailLog;
};

const emailLogStorageKey =
  "fashion-erp-document-email-logs-v1";

export const documentEmailSharedStateKeys = [
  emailLogStorageKey,
] as const;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function escapeHtml(value: string | number) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function textToHtml(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function createHtmlAttachment(
  filename: string,
  html: string,
): DocumentEmailAttachment {
  return {
    filename,
    content: window.btoa(
      unescape(encodeURIComponent(html)),
    ),
    contentType: "text/html; charset=utf-8",
  };
}

function renderDocumentShell(input: {
  title: string;
  documentNumber: string;
  documentDate: string;
  recipientName: string;
  recipientDetails: string[];
  metadata: Array<{
    label: string;
    value: string;
  }>;
  lineTable: string;
  totals?: string;
  notes?: string;
}) {
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(input.title)} ${escapeHtml(
    input.documentNumber,
  )}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f5f7;
      color: #24313f;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .document {
      width: 820px;
      max-width: 100%;
      margin: 32px auto;
      background: #fff;
      padding: 42px;
      border: 1px solid #dce2e7;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      border-bottom: 2px solid #0875c1;
      padding-bottom: 22px;
      margin-bottom: 28px;
    }
    .brand {
      color: #0875c1;
      font-size: 22px;
      font-weight: 700;
    }
    .document-title {
      text-align: right;
    }
    .document-title h1 {
      margin: 0;
      font-size: 23px;
    }
    .document-title strong {
      display: block;
      margin-top: 6px;
      color: #0875c1;
      font-size: 14px;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 34px;
      margin-bottom: 30px;
    }
    .box-title {
      margin-bottom: 8px;
      color: #75808b;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .recipient strong {
      display: block;
      margin-bottom: 3px;
      font-size: 14px;
    }
    .metadata {
      border-collapse: collapse;
      width: 100%;
    }
    .metadata td {
      padding: 4px 0;
      vertical-align: top;
    }
    .metadata td:first-child {
      width: 145px;
      color: #75808b;
    }
    table.lines {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
    }
    .lines th {
      background: #edf1f4;
      border-bottom: 1px solid #cbd3da;
      padding: 9px 8px;
      color: #66717c;
      font-size: 10px;
      text-align: left;
      text-transform: uppercase;
    }
    .lines td {
      border-bottom: 1px solid #e2e6ea;
      padding: 10px 8px;
      vertical-align: top;
    }
    .number {
      text-align: right !important;
      white-space: nowrap;
    }
    .line-sub {
      margin-top: 2px;
      color: #7d8791;
      font-size: 10px;
    }
    .totals {
      width: 330px;
      margin: 20px 0 0 auto;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 1px solid #e3e7ea;
      padding: 7px 0;
    }
    .totals-row.total {
      border-top: 2px solid #24313f;
      border-bottom: 0;
      margin-top: 4px;
      padding-top: 10px;
      font-size: 14px;
      font-weight: 700;
    }
    .notes {
      margin-top: 30px;
      border: 1px solid #dce2e7;
      background: #f8fafb;
      padding: 13px 15px;
    }
    .footer {
      margin-top: 42px;
      border-top: 1px solid #dce2e7;
      padding-top: 13px;
      color: #7d8791;
      font-size: 9px;
      text-align: center;
    }
    @media print {
      body { background: #fff; }
      .document {
        width: auto;
        margin: 0;
        border: 0;
      }
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div>
        <div class="brand">FASHION ERP</div>
        <div>Documentadministratie</div>
      </div>

      <div class="document-title">
        <h1>${escapeHtml(input.title)}</h1>
        <strong>${escapeHtml(
          input.documentNumber,
        )}</strong>
        <div>${escapeHtml(
          formatDate(input.documentDate),
        )}</div>
      </div>
    </header>

    <section class="parties">
      <div class="recipient">
        <div class="box-title">Geadresseerde</div>
        <strong>${escapeHtml(
          input.recipientName,
        )}</strong>
        ${input.recipientDetails
          .filter(Boolean)
          .map(
            (value) =>
              `<div>${escapeHtml(value)}</div>`,
          )
          .join("")}
      </div>

      <div>
        <div class="box-title">Documentgegevens</div>
        <table class="metadata">
          ${input.metadata
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(
                    item.label,
                  )}</td>
                  <td><strong>${escapeHtml(
                    item.value,
                  )}</strong></td>
                </tr>
              `,
            )
            .join("")}
        </table>
      </div>
    </section>

    ${input.lineTable}
    ${input.totals ?? ""}

    ${
      input.notes
        ? `<section class="notes">
            <div class="box-title">Opmerkingen</div>
            ${textToHtml(input.notes)}
          </section>`
        : ""
    }

    <footer class="footer">
      Dit document is gegenereerd vanuit Fashion ERP.
    </footer>
  </main>
</body>
</html>`;
}

function renderPurchaseOrderDocument(
  order: PurchaseOrder,
) {
  const totals = getPurchaseOrderTotals(order);

  const rows = order.lines
    .map(
      (line) => `
        <tr>
          <td>
            <strong>${escapeHtml(
              line.productName,
            )}</strong>
            <div class="line-sub">${escapeHtml(
              line.productCode,
            )} · ${escapeHtml(line.sku)}</div>
          </td>
          <td>${escapeHtml(line.color)}</td>
          <td>${escapeHtml(line.size)}</td>
          <td class="number">${escapeHtml(
            line.orderedQuantity,
          )}</td>
          <td class="number">${escapeHtml(
            formatCurrency(
              line.purchasePrice,
              order.currency,
            ),
          )}</td>
          <td class="number"><strong>${escapeHtml(
            formatCurrency(
              line.orderedQuantity *
                line.purchasePrice,
              order.currency,
            ),
          )}</strong></td>
        </tr>
      `,
    )
    .join("");

  const lineTable = `
    <table class="lines">
      <thead>
        <tr>
          <th>Artikel</th>
          <th>Kleur</th>
          <th>Maat</th>
          <th class="number">Aantal</th>
          <th class="number">Inkoopprijs</th>
          <th class="number">Waarde</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const totalsHtml = `
    <section class="totals">
      <div class="totals-row total">
        <span>Totale inkoopwaarde</span>
        <span>${escapeHtml(
          formatCurrency(
            totals.subtotal,
            order.currency,
          ),
        )}</span>
      </div>
    </section>
  `;

  return renderDocumentShell({
    title: "Inkooporder",
    documentNumber: order.orderNumber,
    documentDate: order.orderDate,
    recipientName: order.supplierName,
    recipientDetails: [
      order.deliveryAddress,
    ],
    metadata: [
      {
        label: "Leverancier",
        value: order.supplierName,
      },
      {
        label: "Leveranciersreferentie",
        value:
          order.supplierReference || "—",
      },
      {
        label: "Collectie",
        value: order.collectionCode || "—",
      },
      {
        label: "Verwachte levering",
        value: formatDate(
          order.expectedDeliveryDate,
        ),
      },
      {
        label: "Betalingstermijn",
        value: getPaymentConditionText(order),
      },
      {
        label: "Valuta",
        value: order.currency,
      },
    ],
    lineTable,
    totals: totalsHtml,
    notes: order.notes,
  });
}

function renderSalesOrderConfirmationDocument(
  order: SalesOrder,
) {
  const totals = getSalesOrderTotals(order);

  const rows = order.lines
    .map(
      (line) => {
        const netUnitPrice =
          line.unitPrice *
          (1 -
            line.discountPercentage / 100);

        return `
          <tr>
            <td>
              <strong>${escapeHtml(
                line.productName,
              )}</strong>
              <div class="line-sub">${escapeHtml(
                line.productCode,
              )} · ${escapeHtml(line.sku)}</div>
            </td>
            <td>${escapeHtml(line.color)}</td>
            <td>${escapeHtml(line.size)}</td>
            <td class="number">${escapeHtml(
              line.quantity,
            )}</td>
            <td class="number">${escapeHtml(
              formatCurrency(line.unitPrice),
            )}</td>
            <td class="number">${escapeHtml(
              line.discountPercentage,
            )}%</td>
            <td class="number"><strong>${escapeHtml(
              formatCurrency(
                line.quantity * netUnitPrice,
              ),
            )}</strong></td>
          </tr>
        `;
      },
    )
    .join("");

  const lineTable = `
    <table class="lines">
      <thead>
        <tr>
          <th>Artikel</th>
          <th>Kleur</th>
          <th>Maat</th>
          <th class="number">Aantal</th>
          <th class="number">Prijs</th>
          <th class="number">Korting</th>
          <th class="number">Totaal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const totalsHtml = `
    <section class="totals">
      <div class="totals-row">
        <span>Subtotaal</span>
        <span>${escapeHtml(
          formatCurrency(totals.subtotal),
        )}</span>
      </div>
      <div class="totals-row">
        <span>BTW</span>
        <span>${escapeHtml(
          formatCurrency(totals.vat),
        )}</span>
      </div>
      <div class="totals-row total">
        <span>Totaal</span>
        <span>${escapeHtml(
          formatCurrency(totals.total),
        )}</span>
      </div>
    </section>
  `;

  return renderDocumentShell({
    title: "Orderbevestiging",
    documentNumber: order.orderNumber,
    documentDate: order.orderDate,
    recipientName: order.customerName,
    recipientDetails: [
      order.contactPerson,
      order.city,
      order.email,
    ],
    metadata: [
      {
        label: "Klantnummer",
        value: order.customerNumber,
      },
      {
        label: "Contactpersoon",
        value: order.contactPerson || "—",
      },
      {
        label: "Gewenste levering",
        value: formatDate(
          order.requestedDeliveryDate,
        ),
      },
      {
        label: "Betalingstermijn",
        value: getPaymentConditionText(order),
      },
      {
        label: "Status",
        value: order.status,
      },
    ],
    lineTable,
    totals: totalsHtml,
    notes: order.notes,
  });
}

function renderPackingSlipDocument(
  order: SalesOrder,
) {
  const rows = order.lines
    .map(
      (line) => `
        <tr>
          <td>
            <strong>${escapeHtml(
              line.productName,
            )}</strong>
            <div class="line-sub">${escapeHtml(
              line.productCode,
            )} · ${escapeHtml(line.sku)}</div>
          </td>
          <td>${escapeHtml(line.color)}</td>
          <td>${escapeHtml(line.size)}</td>
          <td class="number">${escapeHtml(
            line.quantity,
          )}</td>
          <td class="number">${escapeHtml(
            line.deliveredQuantity,
          )}</td>
        </tr>
      `,
    )
    .join("");

  const lineTable = `
    <table class="lines">
      <thead>
        <tr>
          <th>Artikel</th>
          <th>Kleur</th>
          <th>Maat</th>
          <th class="number">Besteld</th>
          <th class="number">Geleverd</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  return renderDocumentShell({
    title: "Pakbon",
    documentNumber: order.orderNumber,
    documentDate: order.orderDate,
    recipientName: order.customerName,
    recipientDetails: [
      order.contactPerson,
      order.city,
    ],
    metadata: [
      {
        label: "Klantnummer",
        value: order.customerNumber,
      },
      {
        label: "Ordernummer",
        value: order.orderNumber,
      },
      {
        label: "Gewenste levering",
        value: formatDate(
          order.requestedDeliveryDate,
        ),
      },
      {
        label: "Status",
        value: order.status,
      },
    ],
    lineTable,
    notes: order.notes,
  });
}

function renderInvoiceDocument(
  invoice: Invoice,
) {
  const rows = invoice.lines
    .map(
      (line) => `
        <tr>
          <td>
            <strong>${escapeHtml(
              line.productName,
            )}</strong>
            <div class="line-sub">${escapeHtml(
              line.productCode,
            )} · ${escapeHtml(line.sku)}</div>
          </td>
          <td>${escapeHtml(line.color)}</td>
          <td>${escapeHtml(line.size)}</td>
          <td class="number">${escapeHtml(
            line.quantity,
          )}</td>
          <td class="number">${escapeHtml(
            formatCurrency(line.unitPrice),
          )}</td>
          <td class="number">${escapeHtml(
            line.discountPercentage,
          )}%</td>
          <td class="number"><strong>${escapeHtml(
            formatCurrency(
              line.lineSubtotal,
            ),
          )}</strong></td>
        </tr>
      `,
    )
    .join("");

  const lineTable = `
    <table class="lines">
      <thead>
        <tr>
          <th>Artikel</th>
          <th>Kleur</th>
          <th>Maat</th>
          <th class="number">Aantal</th>
          <th class="number">Prijs</th>
          <th class="number">Korting</th>
          <th class="number">Totaal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const totalsHtml = `
    <section class="totals">
      <div class="totals-row">
        <span>Subtotaal</span>
        <span>${escapeHtml(
          formatCurrency(invoice.subtotal),
        )}</span>
      </div>
      <div class="totals-row">
        <span>BTW ${escapeHtml(
          invoice.vatRate,
        )}%</span>
        <span>${escapeHtml(
          formatCurrency(invoice.vatAmount),
        )}</span>
      </div>
      <div class="totals-row total">
        <span>Totaal</span>
        <span>${escapeHtml(
          formatCurrency(invoice.total),
        )}</span>
      </div>
    </section>
  `;

  return renderDocumentShell({
    title: "Factuur",
    documentNumber: invoice.invoiceNumber,
    documentDate: invoice.invoiceDate,
    recipientName: invoice.customerName,
    recipientDetails: [
      invoice.contactPerson,
      invoice.city,
      invoice.email,
    ],
    metadata: [
      {
        label: "Factuurnummer",
        value: invoice.invoiceNumber,
      },
      {
        label: "Verkooporder",
        value: invoice.salesOrderNumber,
      },
      {
        label: "Factuurdatum",
        value: formatDate(
          invoice.invoiceDate,
        ),
      },
      {
        label: "Vervaldatum",
        value: formatDate(invoice.dueDate),
      },
      {
        label: "Betalingstermijn",
        value: getPaymentConditionText(invoice),
      },
    ],
    lineTable,
    totals: totalsHtml,
    notes: invoice.notes,
  });
}

function getSenderCompanyName() {
  const settings = getCompanySettings();

  return (
    settings.company.tradeName ||
    settings.company.name ||
    "STITCH-gebruiker"
  );
}

export async function createDocumentEmailDraft(
  documentType: BusinessDocumentType,
  referenceId: string,
): Promise<DocumentEmailDraft> {
  if (documentType === "PURCHASE_ORDER") {
    const order =
      getPurchaseOrderById(referenceId);

    if (!order) {
      throw new Error(
        "Inkooporder niet gevonden.",
      );
    }

    const documentHtml =
      renderPurchaseOrderDocument(order);

    return {
      documentType,
      referenceId: order.id,
      referenceNumber: order.orderNumber,
      to: "",
      cc: "",
      bcc: "",
      subject: `Inkooporder ${order.orderNumber}`,
      message: `Beste heer/mevrouw,

In de bijlage vind je onze inkooporder ${order.orderNumber}.

De verwachte leverdatum is ${formatDate(
        order.expectedDeliveryDate,
      )}.

Met vriendelijke groet,

STITCH ERP Fashion Management`,
      includeAttachment: true,
      attachment: createHtmlAttachment(
        `Inkooporder-${order.orderNumber}.html`,
        documentHtml,
      ),
      recipientName: order.supplierName,
      companyName: order.supplierName,
    };
  }

  if (
    documentType ===
    "SALES_ORDER_CONFIRMATION"
  ) {
    const order =
      await loadSalesOrderById(referenceId);

    if (!order) {
      throw new Error(
        "Verkooporder niet gevonden.",
      );
    }

    const documentHtml =
      renderSalesOrderConfirmationDocument(
        order,
      );

    const customers =
      await getCustomers();

    const customer =
      customers.find(
        (item) =>
          item.id === order.customerId,
      );

    const recipientEmail =
      order.orderEmail ||
      customer?.orderEmail ||
      customer?.email ||
      order.email ||
      "";

    const recipientCc =
      order.orderCc ||
      customer?.orderCc ||
      "";

    return {
      documentType,
      referenceId: order.id,
      referenceNumber: order.orderNumber,
      to: recipientEmail,
      cc: recipientCc,
      bcc: "",
      subject:
        getEmailTemplate("SALES_ORDER_CONFIRMATION")
          ?.subject
          .replaceAll("{{order_number}}", order.orderNumber)
          .replaceAll("{{document_number}}", order.orderNumber)
          .replaceAll("{{customer_name}}", order.customerName)
          .replaceAll("{{company_name}}", getSenderCompanyName())
          || `Orderbevestiging ${order.orderNumber}`,

      message:
        getEmailTemplate("SALES_ORDER_CONFIRMATION")
          ?.message
          .replaceAll("{{recipient_name}}", order.contactPerson || "heer/mevrouw")
          .replaceAll("{{customer_name}}", order.customerName)
          .replaceAll("{{order_number}}", order.orderNumber)
          .replaceAll("{{document_number}}", order.orderNumber)
          .replaceAll("{{company_name}}", getSenderCompanyName())
          .replaceAll("{{sender_name}}", getSenderCompanyName())
          || `Beste ${
            order.contactPerson || "heer/mevrouw"
          },

Hartelijk dank voor uw bestelling.

In de bijlage vindt u de orderbevestiging voor order ${order.orderNumber}.

Met vriendelijke groet,

${getSenderCompanyName()}`,
      includeAttachment: true,
      attachment: createHtmlAttachment(
        `Orderbevestiging-${order.orderNumber}.html`,
        documentHtml,
      ),
      recipientName:
        order.contactPerson ||
        order.customerName,
      companyName: order.customerName,
    };
  }

  if (documentType === "PACKING_SLIP") {
    const order =
      getSalesOrderById(referenceId);

    if (!order) {
      throw new Error(
        "Verkooporder niet gevonden.",
      );
    }

    const documentHtml =
      renderPackingSlipDocument(order);

    const customers =
      await getCustomers();

    const customer =
      customers.find(
        (item) =>
          item.id === order.customerId,
      );

    return {
      documentType,
      referenceId: order.id,
      referenceNumber: order.orderNumber,
      to:
        order.deliveryEmail ||
        customer?.deliveryEmail ||
        customer?.email ||
        order.email ||
        "",
      cc:
        order.deliveryCc ||
        customer?.deliveryCc ||
        "",
      bcc: "",
      subject: `Kopie pakbon ${order.orderNumber}`,
      message: `Beste ${
        order.contactPerson ||
        "heer/mevrouw"
      },

Hierbij ontvang je een kopie van de pakbon voor order ${order.orderNumber}.

Met vriendelijke groet,

STITCH ERP Fashion Management`,
      includeAttachment: true,
      attachment: createHtmlAttachment(
        `Pakbon-${order.orderNumber}.html`,
        documentHtml,
      ),
      recipientName:
        order.contactPerson ||
        order.customerName,
      companyName: order.customerName,
    };
  }

  if (documentType === "CREDIT_NOTE") {
    const credit = getCreditNoteById(
      referenceId,
    );

    if (!credit) {
      throw new Error(
        "Creditfactuur niet gevonden.",
      );
    }

    const originalInvoice = getInvoiceById(
      credit.originalInvoiceId,
    );

    const recipientName =
      originalInvoice?.contactPerson ||
      credit.customerName;

    return {
      documentType,
      referenceId: credit.id,
      referenceNumber:
        credit.creditNumber,
      to: originalInvoice?.email || "",
      cc: "",
      bcc: "",
      subject: `Creditfactuur ${credit.creditNumber}`,
      message: `Beste ${
        recipientName || "heer/mevrouw"
      },

In de bijlage vind je creditfactuur ${credit.creditNumber}.

Deze creditfactuur heeft betrekking op factuur ${credit.originalInvoiceNumber} en retour ${credit.rmaNumber}.

Met vriendelijke groet,

STITCH ERP Fashion Management`,
      includeAttachment: true,
      recipientName,
      companyName: credit.customerName,
    };
  }

  const invoice = getInvoiceById(referenceId);

  if (!invoice) {
    throw new Error("Factuur niet gevonden.");
  }

  const documentHtml =
    renderInvoiceDocument(invoice);

  const customers =
    await getCustomers();

  const customer =
    customers.find(
      (item) =>
        item.id === invoice.customerId,
    );

  return {
    documentType,
    referenceId: invoice.id,
    referenceNumber:
      invoice.invoiceNumber,
    to:
      invoice.invoiceEmail ||
      customer?.invoiceEmail ||
      customer?.email ||
      invoice.email ||
      "",
    cc:
      invoice.invoiceCc ||
      customer?.invoiceCc ||
      "",
    bcc: "",
    subject: `Factuur ${invoice.invoiceNumber}`,
    message: `Beste ${
      invoice.contactPerson ||
      "heer/mevrouw"
    },

In de bijlage vind je factuur ${invoice.invoiceNumber}.

De vervaldatum is ${formatDate(
      invoice.dueDate,
    )}.

Met vriendelijke groet,

STITCH ERP Fashion Management`,
    includeAttachment: true,
    attachment: createHtmlAttachment(
      `Factuur-${invoice.invoiceNumber}.html`,
      documentHtml,
    ),
    recipientName:
      invoice.contactPerson ||
      invoice.customerName,
    companyName: invoice.customerName,
  };
}

export function getDocumentEmailLogs() {
  return getSharedStateValue<DocumentEmailLog[]>(
    emailLogStorageKey,
    [],
  );
}

export function saveDocumentEmailLogs(
  logs: DocumentEmailLog[],
) {
  setSharedStateValue(emailLogStorageKey, logs);
}

export function getDocumentEmailLogsForReference(
  referenceId: string,
) {
  return getDocumentEmailLogs()
    .filter(
      (log) =>
        log.referenceId === referenceId,
    )
    .sort((first, second) =>
      second.createdAt.localeCompare(
        first.createdAt,
      ),
    );
}

export async function sendDocumentEmail({
  draft,
  sentBy = "Daan",
}: SendDocumentEmailInput): Promise<SendDocumentEmailResult> {
  const now = new Date().toISOString();

  const companySettings = getCompanySettings();

  const emailFrom =
    companySettings.company.emailFromAddress ||
    companySettings.company.email;

  const emailReplyTo =
    companySettings.company.emailReplyTo ||
    companySettings.company.email;

  const emailBcc =
    companySettings.company.emailBcc ||
    "";

  const pendingLog: DocumentEmailLog = {
    id: createId("document-email"),
    documentType: draft.documentType,
    referenceId: draft.referenceId,
    referenceNumber:
      draft.referenceNumber,

    to: draft.to.trim(),
    cc: draft.cc.trim(),
    bcc: draft.bcc.trim(),

    subject: draft.subject.trim(),
    message: draft.message,

    status: "SENDING",

    providerMessageId: "",
    errorMessage: "",

    attachmentFilename:
      draft.includeAttachment
        ? draft.attachment?.filename ?? ""
        : "",

    sentBy,
    sentAt: "",
    createdAt: now,
  };

  const existingLogs =
    getDocumentEmailLogs();

  saveDocumentEmailLogs([
    ...existingLogs,
    pendingLog,
  ]);

  try {
    const response = await fetch(
      "/api/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          to: draft.to
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),

          cc: draft.cc
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),

          bcc: draft.bcc
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),

          from: emailFrom,
          replyTo: emailReplyTo,

          bcc: [
            ...draft.bcc
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            ...emailBcc
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          ],

          subject: draft.subject,
          message: draft.message,

          attachment:
            draft.includeAttachment
              ? draft.attachment
              : undefined,
        }),
      },
    );

    const payload = (await response.json()) as {
      success?: boolean;
      id?: string;
      error?: string;
    };

    if (!response.ok || !payload.success) {
      throw new Error(
        payload.error ||
          "E-mail versturen is niet gelukt.",
      );
    }

    const sentLog: DocumentEmailLog = {
      ...pendingLog,
      status: "SENT",
      providerMessageId:
        payload.id ?? "",
      sentAt: new Date().toISOString(),
    };

    saveDocumentEmailLogs(
      getDocumentEmailLogs().map((log) =>
        log.id === pendingLog.id
          ? sentLog
          : log,
      ),
    );

    return {
      success: true,
      messageId:
        sentLog.providerMessageId,
      error: "",
      log: sentLog,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "E-mail versturen is niet gelukt.";

    const failedLog: DocumentEmailLog = {
      ...pendingLog,
      status: "FAILED",
      errorMessage: message,
    };

    saveDocumentEmailLogs(
      getDocumentEmailLogs().map((log) =>
        log.id === pendingLog.id
          ? failedLog
          : log,
      ),
    );

    return {
      success: false,
      messageId: "",
      error: message,
      log: failedLog,
    };
  }
}