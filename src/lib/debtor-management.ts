"use client";

import {
  getInvoiceById,
  getInvoiceOutstandingAmount,
  getInvoices,
  registerInvoicePayment,
  saveInvoices,
  type Invoice,
} from "@/lib/invoices";
import {
  getExactCustomerLink,
} from "@/lib/exact-bridge";

export type ReminderLevel =
  | "Geen"
  | "Herinnering 1"
  | "Herinnering 2"
  | "Aanmaning";

export type ReminderLog = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  email: string;
  level: ReminderLevel;
  subject: string;
  message: string;
  status: "Verstuurd" | "Fout";
  sentAt: string;
  error: string;
};

const reminderLogKey =
  "stitch-erp-reminder-log-v1";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function readLogs(): ReminderLog[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(
    reminderLogKey,
  );

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as ReminderLog[];
  } catch {
    window.localStorage.removeItem(reminderLogKey);
    return [];
  }
}

function saveLogs(logs: ReminderLog[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    reminderLogKey,
    JSON.stringify(logs),
  );
}

export function getReminderLogs() {
  return readLogs().sort((first, second) =>
    second.sentAt.localeCompare(first.sentAt),
  );
}

function daysPastDue(invoice: Invoice) {
  const due = new Date(
    `${invoice.dueDate}T12:00:00`,
  ).getTime();

  const current = new Date(
    `${new Date().toISOString().slice(0, 10)}T12:00:00`,
  ).getTime();

  return Math.max(
    0,
    Math.floor((current - due) / 86_400_000),
  );
}

export function getSuggestedReminderLevel(
  invoice: Invoice,
): ReminderLevel {
  const overdue = daysPastDue(invoice);

  if (overdue >= 30) {
    return "Aanmaning";
  }

  if (overdue >= 14) {
    return "Herinnering 2";
  }

  if (overdue >= 1) {
    return "Herinnering 1";
  }

  return "Geen";
}

export function getDebtorInvoices() {
  return getInvoices()
    .filter(
      (invoice) =>
        invoice.status !== "Concept" &&
        invoice.status !== "Gecrediteerd",
    )
    .map((invoice) => {
      const outstanding =
        getInvoiceOutstandingAmount(invoice);

      const exactLink =
        getExactCustomerLink(invoice.customerId);

      const logs = getReminderLogs().filter(
        (log) => log.invoiceId === invoice.id,
      );

      return {
        invoice,
        outstanding,
        paid: invoice.total - outstanding,
        daysPastDue: daysPastDue(invoice),
        suggestedReminder:
          getSuggestedReminderLevel(invoice),
        latestReminder: logs[0] ?? null,
        exactCustomerCode:
          exactLink?.exactCustomerCode ?? "",
      };
    })
    .sort((first, second) => {
      if (
        first.outstanding > 0 &&
        second.outstanding === 0
      ) {
        return -1;
      }

      if (
        first.outstanding === 0 &&
        second.outstanding > 0
      ) {
        return 1;
      }

      return second.daysPastDue -
        first.daysPastDue;
    });
}

export function createReminderMessage(
  invoice: Invoice,
  level: ReminderLevel,
) {
  const outstanding =
    getInvoiceOutstandingAmount(invoice);

  const amount = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(outstanding);

  if (level === "Aanmaning") {
    return {
      subject: `Aanmaning factuur ${invoice.invoiceNumber}`,
      message: `Beste ${invoice.contactPerson || invoice.customerName},

Volgens onze administratie staat factuur ${invoice.invoiceNumber} met een openstaand bedrag van ${amount} nog niet volledig betaald.

Wij verzoeken je het openstaande bedrag zo spoedig mogelijk te voldoen. Heb je inmiddels betaald of is er een inhoudelijke vraag over de factuur, reageer dan op deze e-mail.

Met vriendelijke groet,

STITCH`,
    };
  }

  const ordinal =
    level === "Herinnering 2"
      ? "Tweede betalingsherinnering"
      : "Betalingsherinnering";

  return {
    subject: `${ordinal} factuur ${invoice.invoiceNumber}`,
    message: `Beste ${invoice.contactPerson || invoice.customerName},

Volgens onze administratie staat factuur ${invoice.invoiceNumber} met een openstaand bedrag van ${amount} nog open.

Mogelijk is de betaling aan je aandacht ontsnapt. Zou je het bedrag willen voldoen? Heb je inmiddels betaald, dan kun je deze herinnering als niet verzonden beschouwen.

Met vriendelijke groet,

STITCH`,
  };
}

export async function sendInvoiceReminder(
  invoiceId: string,
  level?: ReminderLevel,
) {
  const invoice = getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Error("Factuur niet gevonden.");
  }

  const selectedLevel =
    level || getSuggestedReminderLevel(invoice);

  if (selectedLevel === "Geen") {
    throw new Error(
      "Deze factuur is nog niet vervallen.",
    );
  }

  if (!invoice.email) {
    throw new Error(
      "Bij deze klant ontbreekt een e-mailadres.",
    );
  }

  const content = createReminderMessage(
    invoice,
    selectedLevel,
  );

  const log: ReminderLog = {
    id: createId("reminder"),
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    email: invoice.email,
    level: selectedLevel,
    subject: content.subject,
    message: content.message,
    status: "Verstuurd",
    sentAt: now(),
    error: "",
  };

  try {
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: invoice.email,
        cc: "",
        bcc: "",
        subject: content.subject,
        message: content.message,
        attachments: [],
      }),
    });

    const result = await response.json().catch(
      () => null,
    );

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "E-mail kon niet worden verstuurd.",
      );
    }
  } catch (error) {
    const failed = {
      ...log,
      status: "Fout" as const,
      error:
        error instanceof Error
          ? error.message
          : "Onbekende e-mailfout.",
    };

    saveLogs([failed, ...readLogs()]);
    throw error;
  }

  saveLogs([log, ...readLogs()]);
  return log;
}

export function syncMockExactPayments() {
  const invoices = getInvoices();

  const updated = invoices.map((invoice) => {
    if (
      invoice.status === "Concept" ||
      invoice.status === "Gecrediteerd" ||
      invoice.status === "Betaald"
    ) {
      return invoice;
    }

    const link =
      getExactCustomerLink(invoice.customerId);

    if (!link) {
      return invoice;
    }

    // Sandboxgedrag:
    // als Exact voor deze klant geen openstaand saldo
    // meer toont, boeken we het resterende factuurbedrag
    // als betaling terug naar STITCH.
    if (
      link.openAmount === 0 &&
      getInvoiceOutstandingAmount(invoice) > 0
    ) {
      return registerInvoicePayment(
        invoice.id,
        {
          paymentDate:
            new Date().toISOString().slice(0, 10),
          amount:
            getInvoiceOutstandingAmount(invoice),
          method: "Exact Online bankmatch",
          reference: `EXACT-${invoice.invoiceNumber}`,
        },
      ) ?? invoice;
    }

    return invoice;
  });

  // registerInvoicePayment schrijft zelf al weg,
  // maar dit borgt ook ongewijzigde records.
  saveInvoices(
    updated.filter(
      (invoice): invoice is Invoice =>
        Boolean(invoice),
    ),
  );

  return getDebtorInvoices();
}

export function getDebtorDashboard() {
  const rows = getDebtorInvoices();

  const openRows = rows.filter(
    (row) => row.outstanding > 0,
  );

  return {
    openAmount: openRows.reduce(
      (total, row) =>
        total + row.outstanding,
      0,
    ),
    overdueAmount: openRows
      .filter((row) => row.daysPastDue > 0)
      .reduce(
        (total, row) =>
          total + row.outstanding,
        0,
      ),
    overdueInvoices: openRows.filter(
      (row) => row.daysPastDue > 0,
    ).length,
    remindersSent: getReminderLogs().filter(
      (log) => log.status === "Verstuurd",
    ).length,
    oldestDays: openRows.reduce(
      (highest, row) =>
        Math.max(highest, row.daysPastDue),
      0,
    ),
  };
}
