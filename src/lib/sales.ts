"use client";

import {
  getStoredProducts,
  saveProducts,
} from "@/lib/articles";
import {
  appendHistoryEventsOnce,
} from "@/lib/history-engine";

export type SalesOrderStatus =
  | "Concept"
  | "Bevestigd"
  | "Gereserveerd"
  | "Gereed"
  | "Verzonden"
  | "Geannuleerd";

export type SalesOrderLine = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  deliveredQuantity: number;
  reservedQuantity: number;
  unitPrice: number;
  recommendedRetailPrice: number;
  discountPercentage: number;
};

export type SalesOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerNumber: string;
  customerName: string;
  contactPerson: string;
  email: string;
  city: string;
  orderDate: string;
  requestedDeliveryDate: string;
  status: SalesOrderStatus;
  paymentDays: number;
  paymentDiscountPercentage: number;
  paymentDiscountDays: number;
  discountPercentage: number;
  notes: string;
  lines: SalesOrderLine[];
  createdAt: string;
  updatedAt: string;
};

export type SalesOrderInput = {
  customerId: string;
  customerNumber: string;
  customerName: string;
  contactPerson: string;
  email: string;
  city: string;
  requestedDeliveryDate: string;
  status: SalesOrderStatus;
  paymentDays: number;
  paymentDiscountPercentage: number;
  paymentDiscountDays: number;
  discountPercentage: number;
  notes: string;
  lines: Omit<
    SalesOrderLine,
    "id" | "deliveredQuantity" | "reservedQuantity"
  >[];
};

export type SalesOrderAvailability = {
  orderedQuantity: number;
  deliveredQuantity: number;
  openQuantity: number;
  reservedQuantity: number;
  backorderQuantity: number;
  allocationPercentage: number;
  fullyAllocated: boolean;
};

const storageKey = "fashion-erp-sales-orders";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getNextOrderNumber(orders: SalesOrder[]) {
  const year = new Date().getFullYear();

  const highest = orders.reduce((current, order) => {
    const match = order.orderNumber.match(/V\d{4}-(\d+)/);

    if (!match) {
      return current;
    }

    return Math.max(current, Number(match[1]));
  }, 0);

  return `V${year}-${String(highest + 1).padStart(
    5,
    "0",
  )}`;
}

function normalizeSalesOrder(
  order: SalesOrder,
): SalesOrder {
  return {
    ...order,
    paymentDays: typeof order.paymentDays === "number" && order.paymentDays > 0 ? order.paymentDays : 30,
    paymentDiscountPercentage: typeof order.paymentDiscountPercentage === "number" ? Math.max(0, order.paymentDiscountPercentage) : 0,
    paymentDiscountDays: typeof order.paymentDiscountDays === "number" ? Math.max(0, order.paymentDiscountDays) : 0,
    lines: order.lines.map((line) => {
      const legacyReserved =
        order.status === "Gereserveerd" ||
        order.status === "Gereed"
          ? Math.max(
              0,
              line.quantity - line.deliveredQuantity,
            )
          : 0;

      return {
        ...line,
        deliveredQuantity:
          Number(line.deliveredQuantity) || 0,
        recommendedRetailPrice:
          typeof line.recommendedRetailPrice === "number"
            ? Math.max(0, line.recommendedRetailPrice)
            : 0,
        reservedQuantity:
          typeof line.reservedQuantity === "number"
            ? Math.max(
                0,
                Math.min(
                  line.reservedQuantity,
                  Math.max(
                    0,
                    line.quantity -
                      line.deliveredQuantity,
                  ),
                ),
              )
            : legacyReserved,
      };
    }),
  };
}

export function getSalesOrders(): SalesOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored =
    window.localStorage.getItem(storageKey);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      stored,
    ) as SalesOrder[];

    return parsed.map(normalizeSalesOrder);
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

export function saveSalesOrders(
  orders: SalesOrder[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify(orders),
  );
}

export function getSalesOrderById(id: string) {
  return (
    getSalesOrders().find(
      (order) => order.id === id,
    ) ?? null
  );
}

export function getSalesOrderAvailability(
  order: SalesOrder,
): SalesOrderAvailability {
  const orderedQuantity = order.lines.reduce(
    (total, line) => total + line.quantity,
    0,
  );

  const deliveredQuantity = order.lines.reduce(
    (total, line) =>
      total + line.deliveredQuantity,
    0,
  );

  const openQuantity = Math.max(
    0,
    orderedQuantity - deliveredQuantity,
  );

  const reservedQuantity = order.lines.reduce(
    (total, line) =>
      total +
      Math.min(
        line.reservedQuantity,
        Math.max(
          0,
          line.quantity -
            line.deliveredQuantity,
        ),
      ),
    0,
  );

  const backorderQuantity = Math.max(
    0,
    openQuantity - reservedQuantity,
  );

  const allocationPercentage =
    openQuantity > 0
      ? Math.round(
          (reservedQuantity / openQuantity) * 100,
        )
      : 100;

  return {
    orderedQuantity,
    deliveredQuantity,
    openQuantity,
    reservedQuantity,
    backorderQuantity,
    allocationPercentage,
    fullyAllocated: backorderQuantity === 0,
  };
}

function releaseReservedQuantities(
  order: SalesOrder,
) {
  const products = getStoredProducts();

  for (const line of order.lines) {
    if (line.reservedQuantity <= 0) {
      continue;
    }

    const product = products.find(
      (item) => item.id === line.productId,
    );

    const variant = product?.variants.find(
      (item) => item.id === line.variantId,
    );

    if (!product || !variant) {
      continue;
    }

    variant.reservedStock = Math.max(
      0,
      variant.reservedStock -
        line.reservedQuantity,
    );

    product.updatedAt =
      new Date().toISOString();
  }

  saveProducts(products);
}

function allocateOrderAgainstProducts(
  order: SalesOrder,
  products: ReturnType<typeof getStoredProducts>,
) {
  const now = new Date().toISOString();

  const updatedLines = order.lines.map(
    (line) => {
      const openQuantity = Math.max(
        0,
        line.quantity -
          line.deliveredQuantity,
      );

      const currentReserved = Math.min(
        line.reservedQuantity,
        openQuantity,
      );

      const stillNeeded = Math.max(
        0,
        openQuantity - currentReserved,
      );

      if (stillNeeded === 0) {
        return {
          ...line,
          reservedQuantity: currentReserved,
        };
      }

      const product = products.find(
        (item) => item.id === line.productId,
      );

      const variant = product?.variants.find(
        (item) => item.id === line.variantId,
      );

      if (!product || !variant) {
        return {
          ...line,
          reservedQuantity: currentReserved,
        };
      }

      const available = Math.max(
        0,
        variant.physicalStock -
          variant.reservedStock,
      );

      const allocation = Math.min(
        stillNeeded,
        available,
      );

      if (allocation > 0) {
        variant.reservedStock += allocation;
        product.updatedAt = now;
      }

      return {
        ...line,
        reservedQuantity:
          currentReserved + allocation,
      };
    },
  );

  const updatedOrder: SalesOrder = {
    ...order,
    lines: updatedLines,
    updatedAt: now,
  };

  const availability =
    getSalesOrderAvailability(updatedOrder);

  return {
    order: {
      ...updatedOrder,
      status: availability.fullyAllocated
        ? ("Gereserveerd" as const)
        : ("Bevestigd" as const),
    },
    availability,
  };
}

export function allocateSalesOrderStock(
  id: string,
) {
  const orders = getSalesOrders();
  const order = orders.find(
    (item) => item.id === id,
  );

  if (!order) {
    throw new Error(
      "Verkooporder niet gevonden.",
    );
  }

  if (
    order.status === "Concept" ||
    order.status === "Geannuleerd" ||
    order.status === "Verzonden"
  ) {
    throw new Error(
      "Alleen bevestigde open orders kunnen worden gealloceerd.",
    );
  }

  const products = getStoredProducts();
  const result = allocateOrderAgainstProducts(
    order,
    products,
  );

  saveProducts(products);

  saveSalesOrders(
    orders.map((item) =>
      item.id === id ? result.order : item,
    ),
  );

  return result.order;
}

export function allocateOpenSalesOrders() {
  const orders = getSalesOrders();
  const products = getStoredProducts();

  const allocatableOrders = orders
    .filter(
      (order) =>
        order.status === "Bevestigd" ||
        order.status === "Gereserveerd",
    )
    .sort((first, second) => {
      const deliveryComparison =
        first.requestedDeliveryDate.localeCompare(
          second.requestedDeliveryDate,
        );

      if (deliveryComparison !== 0) {
        return deliveryComparison;
      }

      return first.createdAt.localeCompare(
        second.createdAt,
      );
    });

  const updates = new Map<
    string,
    SalesOrder
  >();

  allocatableOrders.forEach((order) => {
    const result = allocateOrderAgainstProducts(
      order,
      products,
    );

    updates.set(order.id, result.order);
  });

  const updatedOrders = orders.map(
    (order) => updates.get(order.id) ?? order,
  );

  saveProducts(products);
  saveSalesOrders(updatedOrders);

  return updatedOrders;
}

export function createSalesOrder(
  input: SalesOrderInput,
) {
  const orders = getSalesOrders();
  const now = new Date().toISOString();

  const lines: SalesOrderLine[] =
    input.lines.map((line) => ({
      ...line,
      id: createId("sales-line"),
      deliveredQuantity: 0,
      reservedQuantity: 0,
    }));

  const requestedStatus = input.status;

  const order: SalesOrder = {
    id: createId("sales-order"),
    orderNumber: getNextOrderNumber(
      orders,
    ),
    customerId: input.customerId,
    customerNumber: input.customerNumber,
    customerName: input.customerName,
    contactPerson: input.contactPerson,
    email: input.email,
    city: input.city,
    orderDate: now.slice(0, 10),
    requestedDeliveryDate:
      input.requestedDeliveryDate,
    status:
      requestedStatus === "Concept"
        ? "Concept"
        : "Bevestigd",
    paymentDays: input.paymentDays,
    paymentDiscountPercentage: input.paymentDiscountPercentage,
    paymentDiscountDays: input.paymentDiscountDays,
    discountPercentage:
      input.discountPercentage,
    notes: input.notes,
    lines,
    createdAt: now,
    updatedAt: now,
  };

  saveSalesOrders([...orders, order]);

  if (
    requestedStatus === "Gereserveerd" ||
    requestedStatus === "Gereed"
  ) {
    return allocateSalesOrderStock(order.id);
  }

  return order;
}

export function confirmSalesOrder(id: string) {
  const orders = getSalesOrders();
  const order = orders.find(
    (item) => item.id === id,
  );

  if (!order) {
    throw new Error(
      "Verkooporder niet gevonden.",
    );
  }

  if (order.status !== "Concept") {
    return order;
  }

  const updated: SalesOrder = {
    ...order,
    status: "Bevestigd",
    updatedAt: new Date().toISOString(),
  };

  saveSalesOrders(
    orders.map((item) =>
      item.id === id ? updated : item,
    ),
  );

  return updated;
}

export function markSalesOrderReady(
  id: string,
) {
  const orders = getSalesOrders();
  const order = orders.find(
    (item) => item.id === id,
  );

  if (!order) {
    throw new Error(
      "Verkooporder niet gevonden.",
    );
  }

  if (order.status === "Bevestigd") {
    throw new Error(
      "Deze order is nog niet volledig beschikbaar. Alloceer eerst de ontbrekende voorraad.",
    );
  }

  if (order.status !== "Gereserveerd") {
    throw new Error(
      "Alleen volledig gereserveerde orders kunnen gereedgemeld worden.",
    );
  }

  const availability =
    getSalesOrderAvailability(order);

  if (!availability.fullyAllocated) {
    throw new Error(
      `De order mist nog ${availability.backorderQuantity} stuks.`,
    );
  }

  const updated: SalesOrder = {
    ...order,
    status: "Gereed",
    updatedAt: new Date().toISOString(),
  };

  saveSalesOrders(
    orders.map((item) =>
      item.id === id ? updated : item,
    ),
  );

  return updated;
}

export function shipSalesOrder(id: string) {
  const orders = getSalesOrders();
  const order = orders.find(
    (item) => item.id === id,
  );

  if (!order) {
    throw new Error(
      "Verkooporder niet gevonden.",
    );
  }

  if (
    order.status !== "Gereserveerd" &&
    order.status !== "Gereed"
  ) {
    throw new Error(
      "Alleen volledig gereserveerde of gereedgemelde orders kunnen worden verzonden.",
    );
  }

  const availability =
    getSalesOrderAvailability(order);

  if (!availability.fullyAllocated) {
    throw new Error(
      `De order mist nog ${availability.backorderQuantity} stuks.`,
    );
  }

  const products = getStoredProducts();

  for (const line of order.lines) {
    const product = products.find(
      (item) => item.id === line.productId,
    );

    const variant = product?.variants.find(
      (item) => item.id === line.variantId,
    );

    if (!product || !variant) {
      throw new Error(
        `Variant ${line.sku} kon niet worden gevonden.`,
      );
    }

    const remaining = Math.max(
      0,
      line.quantity -
        line.deliveredQuantity,
    );

    if (
      line.reservedQuantity < remaining
    ) {
      throw new Error(
        `Niet alle voorraad voor ${line.sku} is gereserveerd.`,
      );
    }

    if (
      variant.physicalStock < remaining
    ) {
      throw new Error(
        `Onvoldoende fysieke voorraad voor ${line.sku}.`,
      );
    }
  }

  for (const line of order.lines) {
    const product = products.find(
      (item) => item.id === line.productId,
    );

    const variant = product?.variants.find(
      (item) => item.id === line.variantId,
    );

    if (!product || !variant) {
      continue;
    }

    const remaining = Math.max(
      0,
      line.quantity -
        line.deliveredQuantity,
    );

    variant.physicalStock = Math.max(
      0,
      variant.physicalStock - remaining,
    );

    variant.reservedStock = Math.max(
      0,
      variant.reservedStock -
        line.reservedQuantity,
    );

    product.updatedAt =
      new Date().toISOString();
  }

  saveProducts(products);

  const updated: SalesOrder = {
    ...order,
    status: "Verzonden",
    lines: order.lines.map((line) => ({
      ...line,
      deliveredQuantity: line.quantity,
      reservedQuantity: 0,
    })),
    updatedAt: new Date().toISOString(),
  };

  saveSalesOrders(
    orders.map((item) =>
      item.id === id ? updated : item,
    ),
  );

  return updated;
}

export function cancelSalesOrder(id: string) {
  const orders = getSalesOrders();
  const order = orders.find(
    (item) => item.id === id,
  );

  if (!order) {
    throw new Error(
      "Verkooporder niet gevonden.",
    );
  }

  releaseReservedQuantities(order);

  const updated: SalesOrder = {
    ...order,
    status: "Geannuleerd",
    lines: order.lines.map((line) => ({
      ...line,
      reservedQuantity: 0,
    })),
    updatedAt: new Date().toISOString(),
  };

  saveSalesOrders(
    orders.map((item) =>
      item.id === id ? updated : item,
    ),
  );

  return updated;
}

export function deleteSalesOrder(id: string) {
  const orders = getSalesOrders();
  const order = orders.find(
    (item) => item.id === id,
  );

  if (!order) {
    return;
  }

  if (order.status !== "Concept") {
    throw new Error(
      "Alleen conceptorders kunnen worden verwijderd.",
    );
  }

  saveSalesOrders(
    orders.filter((item) => item.id !== id),
  );
}

export function getSalesOrderTotals(
  order: SalesOrder,
) {
  const subtotalBeforeDiscount =
    order.lines.reduce(
      (total, line) =>
        total +
        line.quantity * line.unitPrice,
      0,
    );

  const discountAmount =
    order.lines.reduce(
      (total, line) =>
        total +
        line.quantity *
          line.unitPrice *
          (line.discountPercentage / 100),
      0,
    );

  const subtotal =
    subtotalBeforeDiscount -
    discountAmount;

  const vat = subtotal * 0.21;
  const total = subtotal + vat;

  const quantity = order.lines.reduce(
    (sum, line) =>
      sum + line.quantity,
    0,
  );

  const deliveredQuantity =
    order.lines.reduce(
      (sum, line) =>
        sum + line.deliveredQuantity,
      0,
    );

  const reservedQuantity =
    order.lines.reduce(
      (sum, line) =>
        sum + line.reservedQuantity,
      0,
    );

  const backorderQuantity = Math.max(
    0,
    quantity -
      deliveredQuantity -
      reservedQuantity,
  );

  return {
    subtotalBeforeDiscount,
    discountAmount,
    subtotal,
    vat,
    total,
    quantity,
    deliveredQuantity,
    reservedQuantity,
    backorderQuantity,
  };
}
