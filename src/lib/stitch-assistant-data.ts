"use client";

import {
  getStoredProducts,
} from "@/lib/articles";
import {
  getInvoices,
  getInvoiceOutstandingAmount,
} from "@/lib/invoices";
import {
  getCustomers,
  getSuppliers,
} from "@/lib/master-data";
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

function isoDate(value: string) {
  const date = new Date(
    `${value}T12:00:00`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

export function buildAssistantDataSnapshot() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const invoices = getInvoices();
  const bookedInvoices = invoices.filter(
    (invoice) =>
      ![
        "Concept",
        "Gecrediteerd",
      ].includes(invoice.status),
  );
  const ytdInvoices =
    bookedInvoices.filter((invoice) => {
      const date = isoDate(
        invoice.invoiceDate,
      );
      return (
        date?.getFullYear() === currentYear
      );
    });

  const customerRevenue = new Map<
    string,
    {
      customerName: string;
      revenue: number;
      invoiceCount: number;
    }
  >();

  ytdInvoices.forEach((invoice) => {
    const key =
      invoice.customerId ||
      invoice.customerNumber ||
      invoice.customerName;
    const current =
      customerRevenue.get(key) || {
        customerName:
          invoice.customerName,
        revenue: 0,
        invoiceCount: 0,
      };

    current.revenue +=
      Number(invoice.subtotal) || 0;
    current.invoiceCount += 1;
    customerRevenue.set(key, current);
  });

  const openInvoices = invoices
    .map((invoice) => ({
      invoiceNumber:
        invoice.invoiceNumber,
      customerName:
        invoice.customerName,
      invoiceDate:
        invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      outstanding:
        getInvoiceOutstandingAmount(
          invoice,
        ),
    }))
    .filter(
      (invoice) =>
        invoice.outstanding > 0,
    );

  const overdueInvoices =
    openInvoices.filter(
      (invoice) =>
        invoice.dueDate <
        now.toISOString().slice(0, 10),
    );

  const products = getStoredProducts();
  const lowStock = products.flatMap(
    (product) =>
      product.variants
        .filter(
          (variant) =>
            variant.physicalStock <= 0,
        )
        .map((variant) => ({
          productCode: product.code,
          productName: product.name,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          stock: variant.physicalStock,
          minimumStock: 0,
        })),
  );

  const salesOrders = getSalesOrders();
  const purchaseOrders =
    getPurchaseOrders();
  const returns = getCustomerReturns();
  const credits = getCreditNotes();

  return {
    generatedAt: now.toISOString(),
    scope:
      "Read-only samenvatting van lokale STITCH-data",
    totals: {
      customers: getCustomers().length,
      suppliers: getSuppliers().length,
      products: products.length,
      salesOrders: salesOrders.length,
      openSalesOrders:
        salesOrders.filter(
          (order) =>
            ![
              "Verzonden",
              "Geannuleerd",
            ].includes(order.status),
        ).length,
      invoices: invoices.length,
      openInvoices: openInvoices.length,
      overdueInvoices:
        overdueInvoices.length,
      openInvoiceAmount:
        openInvoices.reduce(
          (total, invoice) =>
            total +
            invoice.outstanding,
          0,
        ),
      ytdRevenue:
        ytdInvoices.reduce(
          (total, invoice) =>
            total +
            (Number(invoice.subtotal) ||
              0),
          0,
        ),
      purchaseOrders:
        purchaseOrders.length,
      openPurchaseOrders:
        purchaseOrders.filter(
          (order) =>
            ![
              "Ontvangen",
              "Geannuleerd",
            ].includes(order.status),
        ).length,
      returns: returns.length,
      creditNotes: credits.length,
      lowStockVariants:
        lowStock.length,
    },
    topCustomersYtd: [
      ...customerRevenue.values(),
    ]
      .sort(
        (a, b) =>
          b.revenue - a.revenue,
      )
      .slice(0, 10),
    overdueInvoices:
      overdueInvoices.slice(0, 25),
    openInvoices:
      openInvoices.slice(0, 25),
    lowStock:
      lowStock.slice(0, 30),
    recentSalesOrders: [
      ...salesOrders,
    ]
      .sort((a, b) =>
        b.updatedAt.localeCompare(
          a.updatedAt,
        ),
      )
      .slice(0, 15)
      .map((order) => ({
        orderNumber:
          order.orderNumber,
        customerName:
          order.customerName,
        status: order.status,
        orderDate: order.orderDate,
        requestedDeliveryDate:
          order.requestedDeliveryDate,
      })),
    openPurchaseOrders:
      purchaseOrders
        .filter(
          (order) =>
            ![
              "Ontvangen",
              "Geannuleerd",
            ].includes(order.status),
        )
        .slice(0, 20)
        .map((order) => ({
          orderNumber:
            order.orderNumber,
          supplierName:
            order.supplierName,
          expectedDeliveryDate:
            order.expectedDeliveryDate,
          status: order.status,
        })),
  };
}
