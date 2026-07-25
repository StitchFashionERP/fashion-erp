"use client";

import {
  getCustomers,
  saveCustomers,
  type Customer,
} from "@/lib/master-data";
import {
  getInvoices,
  type Invoice,
} from "@/lib/invoices";
import {
  getCreditNoteById,
  getCreditNotes,
  markCreditExported,
} from "@/lib/returns";

export type ExactConnectionStatus =
  | "Niet gekoppeld"
  | "Sandbox actief"
  | "Gekoppeld"
  | "Fout";

export type ExactCustomerSyncStatus =
  | "Niet gekoppeld"
  | "Te synchroniseren"
  | "Gesynchroniseerd"
  | "Conflict"
  | "Fout";

export type ExactInvoiceExportStatus =
  | "Niet geëxporteerd"
  | "In wachtrij"
  | "Geëxporteerd"
  | "Fout"
  | "Geblokkeerd";

export type ExactBridgeSettings = {
  mode: "sandbox" | "live";
  connectionStatus: ExactConnectionStatus;
  administrationCode: string;
  administrationName: string;
  salesJournalCode: string;
  revenueAccountCode: string;
  vatCode: string;
  compactInvoiceItemCode: string;
  compactCreditItemCode: string;
  compactInvoiceDescription: string;
  compactCreditDescription: string;
  syncCustomersAutomatically: boolean;
  exportInvoicesAutomatically: boolean;
  importOpenItems: boolean;
  lastConnectionCheck: string;
};

export type ExactCustomerLink = {
  id: string;
  customerId: string;
  exactAccountId: string;
  exactCustomerCode: string;
  status: ExactCustomerSyncStatus;
  lastSyncedAt: string;
  lastError: string;
  sourceOfLastChange: "STITCH" | "Exact" | "";
  openAmount: number;
  oldestOpenInvoiceDate: string;
  creditLimit: number;
  availableCredit: number;
};

export type ExactInvoiceExport = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  exactAccountId: string;
  exactCustomerCode: string;
  exactSalesInvoiceId: string;
  exactEntryId: string;
  stitchReference: string;
  bookingItemCode: string;
  bookingDescription: string;
  bookingQuantity: number;
  bookingAmount: number;
  ledgerAccountCode: string;
  vatCode: string;
  bookingVatLines: Array<{
    vatCode: string;
    amount: number;
  }>;
  status: ExactInvoiceExportStatus;
  attempts: number;
  queuedAt: string;
  exportedAt: string;
  lastAttemptAt: string;
  lastError: string;
};

export type ExactSyncLogEntry = {
  id: string;
  entityType: "Klant" | "Factuur" | "Systeem";
  entityId: string;
  action: string;
  status: "Succes" | "Waarschuwing" | "Fout";
  message: string;
  createdAt: string;
};

export type MockExactCustomer = {
  exactAccountId: string;
  exactCustomerCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  paymentDays: number;
  paymentDiscountPercentage: number;
  paymentDiscountDays: number;
  openAmount: number;
  oldestOpenInvoiceDate: string;
  creditLimit: number;
};

const settingsKey =
  "stitch-erp-exact-bridge-settings-v1";
const customerLinksKey =
  "stitch-erp-exact-customer-links-v1";
const invoiceExportsKey =
  "stitch-erp-exact-invoice-exports-v1";
const syncLogKey =
  "stitch-erp-exact-sync-log-v1";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function readObject<T>(
  key: string,
  fallback: T,
): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(key);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as T[];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

function saveObject<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify(value),
  );
}

function saveArray<T>(key: string, values: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify(values),
  );
}

const defaultSettings: ExactBridgeSettings = {
  mode: "sandbox",
  connectionStatus: "Sandbox actief",
  administrationCode: "001",
  administrationName: "STITCH Demo Administratie",
  salesJournalCode: "70",
  revenueAccountCode: "8000",
  vatCode: "VH",
  compactInvoiceItemCode: "STITCH-OMZET",
  compactCreditItemCode: "STITCH-CREDIT",
  compactInvoiceDescription: "Omzet volgens STITCH-factuur",
  compactCreditDescription: "Credit volgens STITCH-creditfactuur",
  syncCustomersAutomatically: true,
  exportInvoicesAutomatically: true,
  importOpenItems: true,
  lastConnectionCheck: "",
};

export const mockExactCustomers: MockExactCustomer[] = [
  {
    exactAccountId: "exact-account-1001",
    exactCustomerCode: "1001",
    companyName: "Van Dijk Mode",
    contactPerson: "Sophie van Dijk",
    email: "inkoop@vandijkmode.example",
    phone: "020 000 1001",
    city: "Amsterdam",
    paymentDays: 30,
    paymentDiscountPercentage: 0,
    paymentDiscountDays: 0,
    openAmount: 3240.5,
    oldestOpenInvoiceDate: "2026-06-18",
    creditLimit: 15000,
  },
  {
    exactAccountId: "exact-account-1002",
    exactCustomerCode: "1002",
    companyName: "Studio June",
    contactPerson: "June de Boer",
    email: "orders@studiojune.example",
    phone: "010 000 1002",
    city: "Rotterdam",
    paymentDays: 14,
    paymentDiscountPercentage: 0,
    paymentDiscountDays: 0,
    openAmount: 0,
    oldestOpenInvoiceDate: "",
    creditLimit: 10000,
  },
  {
    exactAccountId: "exact-account-1003",
    exactCustomerCode: "1003",
    companyName: "Boutique Mae",
    contactPerson: "Mae Jansen",
    email: "inkoop@boutiquemae.example",
    phone: "030 000 1003",
    city: "Utrecht",
    paymentDays: 30,
    paymentDiscountPercentage: 2,
    paymentDiscountDays: 10,
    openAmount: 1185.25,
    oldestOpenInvoiceDate: "2026-07-01",
    creditLimit: 7500,
  },
  {
    exactAccountId: "exact-account-1004",
    exactCustomerCode: "1004",
    companyName: "Maison Nova",
    contactPerson: "Nora Vos",
    email: "orders@maisonnova.example",
    phone: "070 000 1004",
    city: "Den Haag",
    paymentDays: 30,
    paymentDiscountPercentage: 0,
    paymentDiscountDays: 0,
    openAmount: 795.4,
    oldestOpenInvoiceDate: "2026-07-08",
    creditLimit: 5000,
  },
];

export function getExactBridgeSettings() {
  return readObject(
    settingsKey,
    defaultSettings,
  );
}

export function saveExactBridgeSettings(
  settings: ExactBridgeSettings,
) {
  saveObject(settingsKey, settings);
  return settings;
}

export function testExactSandboxConnection() {
  const settings = {
    ...getExactBridgeSettings(),
    mode: "sandbox" as const,
    connectionStatus:
      "Sandbox actief" as const,
    lastConnectionCheck: now(),
  };

  saveExactBridgeSettings(settings);

  addExactSyncLog({
    entityType: "Systeem",
    entityId: "exact-sandbox",
    action: "Verbinding testen",
    status: "Succes",
    message:
      "De mock Exact Online-adapter reageert correct.",
  });

  return settings;
}

export function getExactCustomerLinks() {
  return readArray<ExactCustomerLink>(
    customerLinksKey,
  );
}

function saveCustomerLinks(
  links: ExactCustomerLink[],
) {
  saveArray(customerLinksKey, links);
}

export function getExactCustomerLink(
  customerId: string,
) {
  return (
    getExactCustomerLinks().find(
      (link) => link.customerId === customerId,
    ) ?? null
  );
}

export function linkCustomerToExact(input: {
  customerId: string;
  exactAccountId: string;
  exactCustomerCode: string;
}) {
  const exactCustomer =
    mockExactCustomers.find(
      (item) =>
        item.exactAccountId ===
        input.exactAccountId,
    );

  const links = getExactCustomerLinks();
  const timestamp = now();

  const link: ExactCustomerLink = {
    id:
      links.find(
        (item) =>
          item.customerId === input.customerId,
      )?.id ?? createId("exact-customer-link"),
    customerId: input.customerId,
    exactAccountId: input.exactAccountId,
    exactCustomerCode:
      input.exactCustomerCode,
    status: "Gesynchroniseerd",
    lastSyncedAt: timestamp,
    lastError: "",
    sourceOfLastChange: "STITCH",
    openAmount:
      exactCustomer?.openAmount ?? 0,
    oldestOpenInvoiceDate:
      exactCustomer?.oldestOpenInvoiceDate ?? "",
    creditLimit:
      exactCustomer?.creditLimit ?? 0,
    availableCredit: Math.max(
      0,
      (exactCustomer?.creditLimit ?? 0) -
        (exactCustomer?.openAmount ?? 0),
    ),
  };

  saveCustomerLinks([
    ...links.filter(
      (item) =>
        item.customerId !== input.customerId,
    ),
    link,
  ]);

  addExactSyncLog({
    entityType: "Klant",
    entityId: input.customerId,
    action: "Klant koppelen",
    status: "Succes",
    message: `Gekoppeld aan Exact-relatie ${input.exactCustomerCode}.`,
  });

  return link;
}

export function syncCustomerToExact(
  customerId: string,
) {
  const customer = getCustomers().find(
    (item) => item.id === customerId,
  );

  if (!customer) {
    throw new Error("Klant niet gevonden.");
  }

  const existingLink =
    getExactCustomerLink(customerId);

  if (existingLink) {
    const updated: ExactCustomerLink = {
      ...existingLink,
      status: "Gesynchroniseerd",
      lastSyncedAt: now(),
      lastError: "",
      sourceOfLastChange: "STITCH",
    };

    saveCustomerLinks([
      ...getExactCustomerLinks().filter(
        (item) => item.customerId !== customerId,
      ),
      updated,
    ]);

    addExactSyncLog({
      entityType: "Klant",
      entityId: customerId,
      action: "Klant synchroniseren",
      status: "Succes",
      message: `${customer.companyName} is vanuit STITCH naar Exact gesynchroniseerd. Betalingstermijn: ${customer.paymentDays} dagen.`,
    });

    return updated;
  }

  const exactMatch =
    mockExactCustomers.find(
      (item) =>
        item.email.toLowerCase() ===
          customer.email.toLowerCase() ||
        item.companyName.toLowerCase() ===
          customer.companyName.toLowerCase(),
    );

  if (exactMatch) {
    return linkCustomerToExact({
      customerId,
      exactAccountId:
        exactMatch.exactAccountId,
      exactCustomerCode:
        exactMatch.exactCustomerCode,
    });
  }

  const newCode = String(
    1100 + getExactCustomerLinks().length,
  );

  return linkCustomerToExact({
    customerId,
    exactAccountId: createId(
      "mock-exact-account",
    ),
    exactCustomerCode: newCode,
  });
}

export function importCustomerFromExact(
  exactAccountId: string,
) {
  const source = mockExactCustomers.find(
    (item) =>
      item.exactAccountId === exactAccountId,
  );

  if (!source) {
    throw new Error(
      "Exact-klant niet gevonden.",
    );
  }

  const customers = getCustomers();
  const existing =
    customers.find(
      (customer) =>
        customer.email.toLowerCase() ===
          source.email.toLowerCase() ||
        customer.companyName.toLowerCase() ===
          source.companyName.toLowerCase(),
    );

  if (existing) {
    linkCustomerToExact({
      customerId: existing.id,
      exactAccountId:
        source.exactAccountId,
      exactCustomerCode:
        source.exactCustomerCode,
    });

    return existing;
  }

  const customer: Customer = {
    id: createId("customer"),
    customerNumber: `KLT-${String(
      customers.length + 1,
    ).padStart(4, "0")}`,
    companyName: source.companyName,
    contactPerson: source.contactPerson,
    email: source.email,
    phone: source.phone,
    address: "",
    postalCode: "",
    city: source.city,
    country: "Nederland",
    chamberOfCommerceNumber: "",
    customerType: "Zakelijk",
    vatNumber: "",
    vatNumberStatus: "Niet gecontroleerd",
    vatNumberCheckedAt: "",
    transactionNature: "Goederen",
    language: "Nederlands",

    // STITCH blijft leidend. Bij eerste import
    // nemen we de bestaande Exact-conditie éénmalig over.
    paymentDays: source.paymentDays || 30,
    paymentDiscountPercentage:
      source.paymentDiscountPercentage || 0,
    paymentDiscountDays:
      source.paymentDiscountDays || 0,

    discountPercentage: 0,
    priceListId: "price-list-standard",
    status: "Actief",
  };

  saveCustomers([...customers, customer]);

  linkCustomerToExact({
    customerId: customer.id,
    exactAccountId: source.exactAccountId,
    exactCustomerCode:
      source.exactCustomerCode,
  });

  addExactSyncLog({
    entityType: "Klant",
    entityId: customer.id,
    action: "Klant importeren",
    status: "Succes",
    message: `${customer.companyName} is vanuit Exact naar STITCH geïmporteerd.`,
  });

  return customer;
}

export function syncAllCustomersToExact() {
  const results = getCustomers().map(
    (customer) =>
      syncCustomerToExact(customer.id),
  );

  return results;
}

export function getExactInvoiceExports() {
  return readArray<ExactInvoiceExport>(
    invoiceExportsKey,
  );
}

function saveInvoiceExports(
  exports: ExactInvoiceExport[],
) {
  saveArray(invoiceExportsKey, exports);
}

export function syncInvoiceExportQueue() {
  const existing = getExactInvoiceExports();
  const existingInvoiceIds = new Set(
    existing.map((item) => item.invoiceId),
  );

  const newItems: ExactInvoiceExport[] = [];

  getInvoices()
    .filter(
      (invoice) =>
        invoice.status !== "Concept" &&
        invoice.status !== "Gecrediteerd" &&
        !existingInvoiceIds.has(invoice.id),
    )
    .forEach((invoice) => {
      const link = getExactCustomerLink(
        invoice.customerId,
      );

      newItems.push({
        id: createId("exact-invoice-export"),
        invoiceId: invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        exactAccountId:
          link?.exactAccountId ?? "",
        exactCustomerCode:
          link?.exactCustomerCode ?? "",
        exactSalesInvoiceId: "",
        exactEntryId: "",
        stitchReference:
          invoice.invoiceNumber,
        bookingItemCode:
          getExactBridgeSettings().compactInvoiceItemCode,
        bookingDescription: `${getExactBridgeSettings().compactInvoiceDescription} ${invoice.invoiceNumber}`,
        bookingQuantity: 1,
        bookingAmount: invoice.subtotal,
        ledgerAccountCode:
          getExactBridgeSettings().revenueAccountCode,
        vatCode:
          new Set(
            invoice.lines.map((line) => line.vatCode),
          ).size === 1
            ? invoice.lines[0]?.vatCode || "2V"
            : "MIX",
        bookingVatLines: Array.from(
          invoice.lines.reduce(
            (totals, line) => {
              totals.set(
                line.vatCode,
                (totals.get(line.vatCode) || 0) +
                  line.lineSubtotal,
              );
              return totals;
            },
            new Map<string, number>(),
          ),
        ).map(([vatCode, amount]) => ({
          vatCode,
          amount: Math.round(amount * 100) / 100,
        })),
        status: link
          ? "In wachtrij"
          : "Geblokkeerd",
        attempts: 0,
        queuedAt: now(),
        exportedAt: "",
        lastAttemptAt: "",
        lastError: link
          ? ""
          : "Klant is nog niet gekoppeld aan Exact.",
      });
    });

  if (newItems.length > 0) {
    saveInvoiceExports([
      ...existing,
      ...newItems,
    ]);
  }

  return [...existing, ...newItems];
}

export function exportInvoiceToExactSandbox(
  invoiceId: string,
) {
  syncInvoiceExportQueue();

  const invoice = getInvoices().find(
    (item) => item.id === invoiceId,
  );

  if (!invoice) {
    throw new Error("Factuur niet gevonden.");
  }

  const link = getExactCustomerLink(
    invoice.customerId,
  );

  if (!link) {
    throw new Error(
      "Koppel de klant eerst aan Exact.",
    );
  }

  const exports = getExactInvoiceExports();
  const timestamp = now();

  const exportItem =
    exports.find(
      (item) =>
        item.invoiceId === invoiceId,
    ) ?? {
      id: createId("exact-invoice-export"),
      invoiceId: invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      exactAccountId:
        link.exactAccountId,
      exactCustomerCode:
        link.exactCustomerCode,
      exactSalesInvoiceId: "",
      exactEntryId: "",
      stitchReference:
        invoice.invoiceNumber,
      bookingItemCode:
        getExactBridgeSettings().compactInvoiceItemCode,
      bookingDescription: `${getExactBridgeSettings().compactInvoiceDescription} ${invoice.invoiceNumber}`,
      bookingQuantity: 1,
      bookingAmount: invoice.subtotal,
      ledgerAccountCode:
        getExactBridgeSettings().revenueAccountCode,
      vatCode:
        new Set(
          invoice.lines.map((line) => line.vatCode),
        ).size === 1
          ? invoice.lines[0]?.vatCode || "2V"
          : "MIX",
      bookingVatLines: Array.from(
        invoice.lines.reduce(
          (totals, line) => {
            totals.set(
              line.vatCode,
              (totals.get(line.vatCode) || 0) +
                line.lineSubtotal,
            );
            return totals;
          },
          new Map<string, number>(),
        ),
      ).map(([vatCode, amount]) => ({
        vatCode,
        amount: Math.round(amount * 100) / 100,
      })),
      status:
        "In wachtrij" as ExactInvoiceExportStatus,
      attempts: 0,
      queuedAt: timestamp,
      exportedAt: "",
      lastAttemptAt: "",
      lastError: "",
    };

  const updated: ExactInvoiceExport = {
    ...exportItem,
    exactAccountId: link.exactAccountId,
    exactCustomerCode:
      link.exactCustomerCode,
    exactSalesInvoiceId: createId(
      "mock-exact-sales-invoice",
    ),
    exactEntryId: createId(
      "mock-exact-entry",
    ),
    stitchReference:
      invoice.invoiceNumber,
    bookingItemCode:
      getExactBridgeSettings().compactInvoiceItemCode,
    bookingDescription: `${getExactBridgeSettings().compactInvoiceDescription} ${invoice.invoiceNumber}`,
    bookingQuantity: 1,
    bookingAmount: invoice.subtotal,
    ledgerAccountCode:
      getExactBridgeSettings().revenueAccountCode,
    vatCode:
      new Set(
        invoice.lines.map((line) => line.vatCode),
      ).size === 1
        ? invoice.lines[0]?.vatCode || "2V"
        : "MIX",
    bookingVatLines: Array.from(
      invoice.lines.reduce(
        (totals, line) => {
          totals.set(
            line.vatCode,
            (totals.get(line.vatCode) || 0) +
              line.lineSubtotal,
          );
          return totals;
        },
        new Map<string, number>(),
      ),
    ).map(([vatCode, amount]) => ({
      vatCode,
      amount: Math.round(amount * 100) / 100,
    })),
    status: "Geëxporteerd",
    attempts: exportItem.attempts + 1,
    exportedAt: timestamp,
    lastAttemptAt: timestamp,
    lastError: "",
  };

  saveInvoiceExports([
    ...exports.filter(
      (item) => item.invoiceId !== invoiceId,
    ),
    updated,
  ]);

  addExactSyncLog({
    entityType: "Factuur",
    entityId: invoice.id,
    action: "Factuur exporteren",
    status: "Succes",
    message: `${invoice.invoiceNumber} is compact geboekt op Exact-klant ${link.exactCustomerCode}: 1 regel op grootboek ${getExactBridgeSettings().revenueAccountCode}, artikel ${getExactBridgeSettings().compactInvoiceItemCode}, referentie ${invoice.invoiceNumber}.`,
  });

  return updated;
}

export function exportAllQueuedInvoices() {
  const queue = syncInvoiceExportQueue();

  const exported: ExactInvoiceExport[] = [];
  const errors: string[] = [];

  queue
    .filter(
      (item) =>
        item.status === "In wachtrij" ||
        item.status === "Fout",
    )
    .forEach((item) => {
      try {
        exported.push(
          exportInvoiceToExactSandbox(
            item.invoiceId,
          ),
        );
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : "Onbekende exportfout.",
        );
      }
    });

  return { exported, errors };
}


export function exportCreditNoteToExactSandbox(
  creditNoteId: string,
) {
  const credit = getCreditNoteById(
    creditNoteId,
  );

  if (!credit) {
    throw new Error(
      "Creditfactuur niet gevonden.",
    );
  }

  const link = getExactCustomerLink(
    credit.customerId,
  );

  if (!link) {
    throw new Error(
      "Koppel de klant eerst aan Exact.",
    );
  }

  const exactCreditInvoiceId = createId(
    "mock-exact-credit-invoice",
  );
  const exactEntryId = createId(
    "mock-exact-credit-entry",
  );

  const updated = markCreditExported({
    creditNoteId,
    exactCreditInvoiceId,
    exactEntryId,
  });

  addExactSyncLog({
    entityType: "Factuur",
    entityId: credit.id,
    action: "Creditfactuur exporteren",
    status: "Succes",
    message: `${credit.creditNumber} is compact geboekt op Exact-klant ${link.exactCustomerCode}: 1 regel op grootboek ${getExactBridgeSettings().revenueAccountCode}, artikel ${getExactBridgeSettings().compactCreditItemCode}, referentie ${credit.creditNumber}. Oorspronkelijke factuur: ${credit.originalInvoiceNumber}.`,
  });

  return updated;
}

export function getExactSyncLog() {
  return readArray<ExactSyncLogEntry>(
    syncLogKey,
  ).sort((first, second) =>
    second.createdAt.localeCompare(
      first.createdAt,
    ),
  );
}

export function addExactSyncLog(
  input: Omit<
    ExactSyncLogEntry,
    "id" | "createdAt"
  >,
) {
  const entry: ExactSyncLogEntry = {
    ...input,
    id: createId("exact-log"),
    createdAt: now(),
  };

  saveArray(syncLogKey, [
    entry,
    ...getExactSyncLog(),
  ]);

  return entry;
}

export function getExactBridgeDashboard() {
  const links = getExactCustomerLinks();
  const exports = syncInvoiceExportQueue();

  return {
    connection:
      getExactBridgeSettings()
        .connectionStatus,
    linkedCustomers: links.filter(
      (item) =>
        item.status === "Gesynchroniseerd",
    ).length,
    totalCustomers: getCustomers().length,
    queuedInvoices: exports.filter(
      (item) =>
        item.status === "In wachtrij",
    ).length,
    blockedInvoices: exports.filter(
      (item) =>
        item.status === "Geblokkeerd" ||
        item.status === "Fout",
    ).length,
    exportedInvoices: exports.filter(
      (item) =>
        item.status === "Geëxporteerd",
    ).length,
    creditNotesQueued: getCreditNotes().filter(
      (item) => item.exactExportStatus !== "Geëxporteerd",
    ).length,
    openAmount: links.reduce(
      (total, item) =>
        total + item.openAmount,
      0,
    ),
  };
}
