"use client";

import {
  getStoredProducts,
  saveProducts,
} from "@/lib/articles";
import {
  getWarehouseLocations,
  receiveWarehouseStock,
} from "@/lib/warehouse";
import {
  getSharedStateValue,
  setSharedStateValue,
} from "@/lib/shared-state-client";

export type ProductionOrderStatus =
  | "Concept"
  | "Besteld"
  | "In productie"
  | "Verzonden"
  | "Ontvangen"
  | "Geannuleerd";

export type ProductionOrderLine = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  orderedQuantity: number;
  receivedQuantity: number;
  purchasePrice: number;
};

export type ProductionOrder = {
  id: string;
  productionNumber: string;
  supplierId: string;
  supplierName: string;
  supplierReference: string;
  collectionCode: string;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate: string;
  status: ProductionOrderStatus;
  notes: string;
  warehouseLocationId: string;
  lines: ProductionOrderLine[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrderInput = {
  supplierId: string;
  supplierName: string;
  supplierReference?: string;
  collectionCode: string;
  expectedDeliveryDate: string;
  status?: ProductionOrderStatus;
  notes?: string;
  lines: Array<
    Omit<
      ProductionOrderLine,
      "id" | "receivedQuantity"
    >
  >;
};

const storageKey =
  "stitch-erp-production-orders-v1";

export const productionSharedStateKeys = [
  storageKey,
] as const;

function now() {
  return new Date().toISOString();
}

function today() {
  return now().slice(0, 10);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function read(): ProductionOrder[] {
  return getSharedStateValue<ProductionOrder[]>(
    storageKey,
    [],
  );
}

function save(items: ProductionOrder[]) {
  setSharedStateValue(storageKey, items);
}

function nextProductionNumber(
  orders: ProductionOrder[],
) {
  const year = new Date().getFullYear();

  const highest = orders.reduce(
    (current, order) => {
      const match = order.productionNumber.match(
        new RegExp(`^PROD-${year}-(\\d+)$`),
      );

      return match
        ? Math.max(current, Number(match[1]))
        : current;
    },
    0,
  );

  return `PROD-${year}-${String(
    highest + 1,
  ).padStart(5, "0")}`;
}

export function getProductionOrders() {
  return read().sort((first, second) =>
    second.createdAt.localeCompare(
      first.createdAt,
    ),
  );
}

export function getProductionOrderById(
  id: string,
) {
  return (
    getProductionOrders().find(
      (item) => item.id === id,
    ) ?? null
  );
}

export function createProductionOrder(
  input: ProductionOrderInput,
) {
  if (!input.supplierId) {
    throw new Error(
      "Selecteer een leverancier.",
    );
  }

  if (!input.collectionCode) {
    throw new Error(
      "Selecteer een collectie.",
    );
  }

  if (!input.expectedDeliveryDate) {
    throw new Error(
      "Vul een geplande leverdatum in.",
    );
  }

  if (input.lines.length === 0) {
    throw new Error(
      "Voeg minimaal één variant toe.",
    );
  }

  const orders = getProductionOrders();
  const timestamp = now();

  const order: ProductionOrder = {
    id: createId("production-order"),
    productionNumber:
      nextProductionNumber(orders),
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    supplierReference:
      input.supplierReference?.trim() || "",
    collectionCode: input.collectionCode,
    orderDate: today(),
    expectedDeliveryDate:
      input.expectedDeliveryDate,
    actualDeliveryDate: "",
    status: input.status || "Concept",
    notes: input.notes?.trim() || "",
    warehouseLocationId: "",
    lines: input.lines.map((line) => ({
      ...line,
      id: createId("production-line"),
      orderedQuantity: Math.max(
        1,
        Math.floor(line.orderedQuantity),
      ),
      receivedQuantity: 0,
      purchasePrice: Math.max(
        0,
        Number(line.purchasePrice) || 0,
      ),
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  save([order, ...orders]);
  return order;
}

export function updateProductionOrder(
  id: string,
  changes: Partial<ProductionOrder>,
) {
  const orders = getProductionOrders().map(
    (order) =>
      order.id === id
        ? {
            ...order,
            ...changes,
            updatedAt: now(),
          }
        : order,
  );

  save(orders);

  return (
    orders.find((order) => order.id === id) ??
    null
  );
}

export function updateProductionStatus(
  id: string,
  status: ProductionOrderStatus,
) {
  return updateProductionOrder(id, {
    status,
  });
}

export function cancelProductionOrder(
  id: string,
) {
  const order = getProductionOrderById(id);

  if (!order) {
    throw new Error(
      "Productieorder niet gevonden.",
    );
  }

  if (order.status === "Ontvangen") {
    throw new Error(
      "Een ontvangen productieorder kan niet worden geannuleerd.",
    );
  }

  return updateProductionOrder(id, {
    status: "Geannuleerd",
  });
}

export function receiveProductionOrder(input: {
  productionOrderId: string;
  warehouseLocationId?: string;
}) {
  const order = getProductionOrderById(
    input.productionOrderId,
  );

  if (!order) {
    throw new Error(
      "Productieorder niet gevonden.",
    );
  }

  if (order.status === "Ontvangen") {
    return order;
  }

  if (order.status === "Geannuleerd") {
    throw new Error(
      "Een geannuleerde productieorder kan niet worden ontvangen.",
    );
  }

  const locationId =
    input.warehouseLocationId ||
    getWarehouseLocations().find(
      (location) =>
        location.active &&
        (location.type === "Ontvangst" ||
          location.type === "Bulk" ||
          location.type === "Pick"),
    )?.id;

  if (!locationId) {
    throw new Error(
      "Er is geen actieve voorraadlocatie beschikbaar.",
    );
  }

  const products = getStoredProducts();

  order.lines.forEach((line) => {
    const remaining = Math.max(
      0,
      line.orderedQuantity -
        line.receivedQuantity,
    );

    if (remaining <= 0) {
      return;
    }

    receiveWarehouseStock({
      productId: line.productId,
      variantId: line.variantId,
      locationId,
      quantity: remaining,
      reason: `Ontvangst ${order.productionNumber}`,
    });

    const product = products.find(
      (item) => item.id === line.productId,
    );

    const variant = product?.variants.find(
      (item) => item.id === line.variantId,
    );

    if (variant) {
      variant.physicalStock += remaining;
    }

    if (product) {
      product.updatedAt = now();
    }
  });

  saveProducts(products);

  return updateProductionOrder(order.id, {
    status: "Ontvangen",
    actualDeliveryDate: today(),
    warehouseLocationId: locationId,
    lines: order.lines.map((line) => ({
      ...line,
      receivedQuantity:
        line.orderedQuantity,
    })),
  });
}

export function getProductionOrderTotals(
  order: ProductionOrder,
) {
  const orderedQuantity = order.lines.reduce(
    (total, line) =>
      total + line.orderedQuantity,
    0,
  );

  const receivedQuantity = order.lines.reduce(
    (total, line) =>
      total + line.receivedQuantity,
    0,
  );

  const value = order.lines.reduce(
    (total, line) =>
      total +
      line.orderedQuantity *
        line.purchasePrice,
    0,
  );

  return {
    orderedQuantity,
    receivedQuantity,
    remainingQuantity: Math.max(
      0,
      orderedQuantity - receivedQuantity,
    ),
    value,
    progress:
      orderedQuantity > 0
        ? Math.round(
            (receivedQuantity /
              orderedQuantity) *
              100,
          )
        : 0,
  };
}

export function isProductionOrderOverdue(
  order: ProductionOrder,
) {
  if (
    order.status === "Ontvangen" ||
    order.status === "Geannuleerd" ||
    !order.expectedDeliveryDate
  ) {
    return false;
  }

  return (
    order.expectedDeliveryDate <
    new Date().toISOString().slice(0, 10)
  );
}

export function getProductionDashboard() {
  const orders = getProductionOrders();

  return {
    open: orders.filter(
      (order) =>
        !["Ontvangen", "Geannuleerd"].includes(
          order.status,
        ),
    ).length,
    inProduction: orders.filter(
      (order) =>
        order.status === "In productie",
    ).length,
    inTransit: orders.filter(
      (order) => order.status === "Verzonden",
    ).length,
    overdue: orders.filter(
      isProductionOrderOverdue,
    ).length,
  };
}
