"use client";

import {
  getInvoices,
} from "@/lib/invoices";
import {
  getPurchaseOrders,
} from "@/lib/purchasing";
import {
  getCustomerReturns,
} from "@/lib/returns";
import {
  getSalesOrders,
} from "@/lib/sales";

export type RelationHistoryCheck = {
  canDelete: boolean;
  totalReferences: number;
  references: Array<{
    label: string;
    count: number;
  }>;
  message: string;
};

export function getCustomerHistoryCheck(
  customerId: string,
): RelationHistoryCheck {
  const salesOrders = getSalesOrders().filter(
    (item) => item.customerId === customerId,
  ).length;

  const invoices = getInvoices().filter(
    (item) => item.customerId === customerId,
  ).length;

  const returns = getCustomerReturns().filter(
    (item) => item.customerId === customerId,
  ).length;

  const references = [
    {
      label: "verkooporders",
      count: salesOrders,
    },
    {
      label: "facturen",
      count: invoices,
    },
    {
      label: "retouren",
      count: returns,
    },
  ].filter((item) => item.count > 0);

  const totalReferences = references.reduce(
    (total, item) => total + item.count,
    0,
  );

  return {
    canDelete: totalReferences === 0,
    totalReferences,
    references,
    message:
      totalReferences === 0
        ? "Deze klant heeft geen historie en kan worden verwijderd."
        : `Deze klant heeft ${references
            .map(
              (item) =>
                `${item.count} ${item.label}`,
            )
            .join(
              ", ",
            )} en kan daarom niet worden verwijderd. Archiveer de klant in plaats daarvan.`,
  };
}

export function getSupplierHistoryCheck(
  supplierId: string,
): RelationHistoryCheck {
  const purchaseOrders =
    getPurchaseOrders().filter(
      (item) => item.supplierId === supplierId,
    ).length;

  const references = [
    {
      label: "inkooporders",
      count: purchaseOrders,
    },
  ].filter((item) => item.count > 0);

  const totalReferences = references.reduce(
    (total, item) => total + item.count,
    0,
  );

  return {
    canDelete: totalReferences === 0,
    totalReferences,
    references,
    message:
      totalReferences === 0
        ? "Deze leverancier heeft geen historie en kan worden verwijderd."
        : `Deze leverancier heeft ${purchaseOrders} inkooporder${
            purchaseOrders === 1 ? "" : "s"
          } en kan daarom niet worden verwijderd. Archiveer de leverancier in plaats daarvan.`,
  };
}
