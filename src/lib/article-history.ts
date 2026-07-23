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
import {
  getWarehouseStockPositions,
} from "@/lib/warehouse";

export type ArticleHistoryCheck = {
  canDelete: boolean;
  totalReferences: number;
  references: Array<{
    label: string;
    count: number;
  }>;
  message: string;
};

export function getArticleHistoryCheck(
  productId: string,
): ArticleHistoryCheck {
  const salesOrderLines = getSalesOrders()
    .flatMap((order) => order.lines)
    .filter(
      (line) => line.productId === productId,
    ).length;

  const invoiceLines = getInvoices()
    .flatMap((invoice) => invoice.lines)
    .filter(
      (line) => line.productId === productId,
    ).length;

  const returnLines = getCustomerReturns()
    .flatMap((item) => item.lines)
    .filter(
      (line) => line.productId === productId,
    ).length;

  const purchaseOrderLines =
    getPurchaseOrders()
      .flatMap((order) => order.lines)
      .filter(
        (line) => line.productId === productId,
      ).length;

  const warehousePositions =
    getWarehouseStockPositions().filter(
      (position) =>
        position.productId === productId &&
        position.quantity !== 0,
    ).length;

  const references = [
    {
      label: "verkooporderregels",
      count: salesOrderLines,
    },
    {
      label: "factuurregels",
      count: invoiceLines,
    },
    {
      label: "retourregels",
      count: returnLines,
    },
    {
      label: "inkooporderregels",
      count: purchaseOrderLines,
    },
    {
      label: "voorraadposities",
      count: warehousePositions,
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
        ? "Dit artikel heeft geen historie en kan worden verwijderd."
        : `Dit artikel heeft ${references
            .map(
              (item) =>
                `${item.count} ${item.label}`,
            )
            .join(
              ", ",
            )} en kan daarom niet worden verwijderd. Zet het artikel op Inactief in plaats daarvan.`,
  };
}
