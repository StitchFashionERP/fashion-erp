"use client";

import {
  getInvoices,
  getInvoiceOutstandingAmount,
} from "@/lib/invoices";
import {
  getPurchaseOrders,
} from "@/lib/purchasing";
import {
  getCustomerReturns,
  getCreditNotes,
} from "@/lib/returns";
import {
  getSalesOrders,
} from "@/lib/sales";
import {
  getHistoryEvents,
} from "@/lib/history-engine";

export type AuditStatus =
  | "Goed"
  | "Aandacht"
  | "Fout";

export type AuditCheck = {
  label: string;
  status: AuditStatus;
  detail: string;
};

export function runWorkflowAudit(): AuditCheck[] {
  const orders = getSalesOrders();
  const invoices = getInvoices();
  const returns = getCustomerReturns();
  const credits = getCreditNotes();
  const purchases = getPurchaseOrders();
  const history = getHistoryEvents();

  const shippedWithoutInvoice =
    orders.filter(
      (order) =>
        order.status === "Verzonden" &&
        !invoices.some(
          (invoice) =>
            invoice.salesOrderId ===
            order.id,
        ),
    );

  const returnsWithoutCredit =
    returns.filter(
      (item) =>
        item.status === "Gecontroleerd" &&
        !credits.some(
          (credit) =>
            credit.returnId === item.id,
        ),
    );

  const negativeOutstanding =
    invoices.filter(
      (invoice) =>
        getInvoiceOutstandingAmount(
          invoice,
        ) < 0,
    );

  const overduePurchases =
    purchases.filter(
      (order) =>
        ![
          "Ontvangen",
          "Geannuleerd",
        ].includes(order.status) &&
        order.expectedDeliveryDate <
          new Date()
            .toISOString()
            .slice(0, 10),
    );

  return [
    {
      label:
        "Verzonden orders met factuur",
      status:
        shippedWithoutInvoice.length === 0
          ? "Goed"
          : "Aandacht",
      detail:
        shippedWithoutInvoice.length === 0
          ? "Alle verzonden orders hebben een factuur."
          : `${shippedWithoutInvoice.length} verzonden order(s) hebben nog geen factuur.`,
    },
    {
      label:
        "Gecontroleerde retouren met credit",
      status:
        returnsWithoutCredit.length === 0
          ? "Goed"
          : "Aandacht",
      detail:
        returnsWithoutCredit.length === 0
          ? "Alle gecontroleerde retouren zijn gecrediteerd."
          : `${returnsWithoutCredit.length} gecontroleerde retour(en) wachten op een creditfactuur.`,
    },
    {
      label: "Openstaande bedragen",
      status:
        negativeOutstanding.length === 0
          ? "Goed"
          : "Fout",
      detail:
        negativeOutstanding.length === 0
          ? "Geen facturen met een negatief openstaand bedrag."
          : `${negativeOutstanding.length} factuur/facturen hebben een ongeldige betaalstand.`,
    },
    {
      label: "Inkoopplanning",
      status:
        overduePurchases.length === 0
          ? "Goed"
          : "Aandacht",
      detail:
        overduePurchases.length === 0
          ? "Geen achterstallige open inkooporders."
          : `${overduePurchases.length} inkooporder(s) zijn te laat.`,
    },
    {
      label: "History Engine",
      status:
        history.length > 0
          ? "Goed"
          : "Aandacht",
      detail:
        history.length > 0
          ? `${history.length} historische datapunten beschikbaar.`
          : "De History Engine staat klaar en begint bij de eerstvolgende mutatie met registreren.",
    },
  ];
}
