"use client";

import {
  getStoredProducts,
  saveProducts,
} from "@/lib/articles";
import { getSharedStateValue, setSharedStateValue } from "@/lib/shared-state-client";
import {
  getPurchaseReceipts,
} from "@/lib/purchasing";
import {
  getSalesOrders,
  saveSalesOrders,
  type SalesOrder,
} from "@/lib/sales";

export type WarehouseLocationType =
  | "Ontvangst"
  | "Bulk"
  | "Pick"
  | "Pakstation"
  | "Retour"
  | "Quarantaine";

export type WarehouseLocation = {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  zone: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  type: WarehouseLocationType;
  active: boolean;
  capacity: number;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseStockPosition = {
  id: string;
  productId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
};

export type WarehouseTransfer = {
  id: string;
  productId: string;
  variantId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason: string;
  userName: string;
  createdAt: string;
};

export type PutAwayTaskStatus =
  | "Open"
  | "Deels verwerkt"
  | "Voltooid";

export type PutAwayTask = {
  id: string;
  receiptId: string;
  receiptNumber: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  processedQuantity: number;
  suggestedLocationId: string;
  status: PutAwayTaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type PickListStatus =
  | "Open"
  | "Bezig"
  | "Gepickt"
  | "Verpakt"
  | "Verzonden";

export type PickListLine = {
  id: string;
  salesOrderLineId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  color: string;
  size: string;
  requiredQuantity: number;
  pickedQuantity: number;
  locationId: string;
};

export type PickList = {
  id: string;
  pickNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  requestedDeliveryDate: string;
  status: PickListStatus;
  lines: PickListLine[];
  assignedTo: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StockCountStatus =
  | "Concept"
  | "In uitvoering"
  | "Afgerond";

export type StockCountLine = {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  color: string;
  size: string;
  locationId: string;
  expectedQuantity: number;
  countedQuantity: number | null;
};

export type StockCount = {
  id: string;
  countNumber: string;
  locationId: string;
  status: StockCountStatus;
  assignedTo: string;
  notes: string;
  lines: StockCountLine[];
  createdAt: string;
  updatedAt: string;
  completedAt: string;
};

const locationsKey =
  "stitch-erp-warehouse-locations-v1";
const positionsKey =
  "stitch-erp-warehouse-positions-v1";
const transfersKey =
  "stitch-erp-warehouse-transfers-v1";
const putAwayKey =
  "stitch-erp-put-away-tasks-v1";
const pickListsKey =
  "stitch-erp-pick-lists-v1";
const stockCountsKey =
  "stitch-erp-stock-counts-v1";

export const warehouseSharedStateKeys = [
  locationsKey,
  positionsKey,
  transfersKey,
  putAwayKey,
  pickListsKey,
  stockCountsKey,
] as const;

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function read<T>(key: string): T[] {
  return getSharedStateValue<T[]>(key, []);
}

function save<T>(key: string, items: T[]) {
  setSharedStateValue(key, items);
}

function defaultLocations(): WarehouseLocation[] {
  const timestamp = now();

  return [
    {
      id: "location-receiving",
      code: "ONTVANGST",
      name: "Goederenontvangst",
      warehouse: "Hoofdmagazijn",
      zone: "IN",
      aisle: "",
      rack: "",
      shelf: "",
      bin: "",
      type: "Ontvangst",
      active: true,
      capacity: 99999,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "location-bulk-a",
      code: "A-01-01",
      name: "Bulkstelling A",
      warehouse: "Hoofdmagazijn",
      zone: "A",
      aisle: "01",
      rack: "01",
      shelf: "01",
      bin: "",
      type: "Bulk",
      active: true,
      capacity: 5000,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "location-pick-a",
      code: "P-01-01",
      name: "Picklocatie A",
      warehouse: "Hoofdmagazijn",
      zone: "P",
      aisle: "01",
      rack: "01",
      shelf: "01",
      bin: "",
      type: "Pick",
      active: true,
      capacity: 500,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "location-packing",
      code: "PAK-01",
      name: "Pakstation 1",
      warehouse: "Hoofdmagazijn",
      zone: "OUT",
      aisle: "",
      rack: "",
      shelf: "",
      bin: "",
      type: "Pakstation",
      active: true,
      capacity: 99999,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "location-returns",
      code: "RET-01",
      name: "Retourcontrole",
      warehouse: "Hoofdmagazijn",
      zone: "RET",
      aisle: "",
      rack: "",
      shelf: "",
      bin: "",
      type: "Retour",
      active: true,
      capacity: 99999,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export function getWarehouseLocations() {
  const stored = read<WarehouseLocation>(
    locationsKey,
  );

  if (stored.length > 0) {
    return stored;
  }

  const defaults = defaultLocations();
  save(locationsKey, defaults);
  return defaults;
}

export function createWarehouseLocation(
  input: Omit<
    WarehouseLocation,
    "id" | "createdAt" | "updatedAt"
  >,
) {
  const locations = getWarehouseLocations();

  const normalizedCode = input.code
    .trim()
    .toUpperCase();

  if (!normalizedCode) {
    throw new Error(
      "Vul een locatiecode in.",
    );
  }

  if (
    locations.some(
      (item) => item.code === normalizedCode,
    )
  ) {
    throw new Error(
      "Deze locatiecode bestaat al.",
    );
  }

  const timestamp = now();

  const location: WarehouseLocation = {
    ...input,
    id: createId("location"),
    code: normalizedCode,
    name: input.name.trim() || normalizedCode,
    capacity: Math.max(
      0,
      Math.floor(input.capacity || 0),
    ),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  save(locationsKey, [...locations, location]);
  return location;
}

export function updateWarehouseLocation(
  id: string,
  changes: Partial<WarehouseLocation>,
) {
  const locations = getWarehouseLocations().map(
    (location) =>
      location.id === id
        ? {
            ...location,
            ...changes,
            updatedAt: now(),
          }
        : location,
  );

  save(locationsKey, locations);

  return (
    locations.find(
      (location) => location.id === id,
    ) ?? null
  );
}

export function deleteWarehouseLocation(id: string) {
  const location = getWarehouseLocations().find(
    (item) => item.id === id,
  );

  if (!location) {
    throw new Error("Voorraadlocatie niet gevonden.");
  }

  const hasStock = getWarehouseStockPositions().some(
    (position) =>
      position.locationId === id &&
      position.quantity !== 0,
  );

  if (hasStock) {
    throw new Error(
      "Deze locatie bevat nog voorraad. Verplaats de voorraad eerst of zet de locatie op inactief.",
    );
  }

  const usedInPutAway = getPutAwayTasks().some(
    (task) =>
      task.suggestedLocationId === id &&
      task.status !== "Voltooid",
  );

  const usedInPickLists = getPickLists().some(
    (list) =>
      list.status !== "Verzonden" &&
      list.lines.some(
        (line) => line.locationId === id,
      ),
  );

  const usedInCounts = getStockCounts().some(
    (count) =>
      count.locationId === id &&
      count.status !== "Afgerond",
  );

  if (
    usedInPutAway ||
    usedInPickLists ||
    usedInCounts
  ) {
    throw new Error(
      "Deze locatie wordt nog gebruikt in een actief magazijnproces. Zet de locatie voorlopig op inactief.",
    );
  }

  const remaining = getWarehouseLocations().filter(
    (item) => item.id !== id,
  );

  save(locationsKey, remaining);
  return true;
}

export function getWarehouseStockPositions() {
  return read<WarehouseStockPosition>(
    positionsKey,
  );
}

function savePositions(
  positions: WarehouseStockPosition[],
) {
  save(positionsKey, positions);
}

export function initializeWarehouseStock() {
  const products = getStoredProducts();
  const positions = getWarehouseStockPositions();

  if (positions.length > 0) {
    return positions;
  }

  const defaultPick =
    getWarehouseLocations().find(
      (item) => item.type === "Pick",
    ) ?? getWarehouseLocations()[0];

  const timestamp = now();

  const initial = products.flatMap((product) =>
    product.variants
      .filter(
        (variant) => variant.physicalStock > 0,
      )
      .map((variant) => ({
        id: createId("position"),
        productId: product.id,
        variantId: variant.id,
        locationId: defaultPick.id,
        quantity: variant.physicalStock,
        updatedAt: timestamp,
      })),
  );

  savePositions(initial);
  return initial;
}

export function getStockAtLocation(
  variantId: string,
  locationId: string,
) {
  return getWarehouseStockPositions()
    .filter(
      (position) =>
        position.variantId === variantId &&
        position.locationId === locationId,
    )
    .reduce(
      (total, position) =>
        total + position.quantity,
      0,
    );
}

export function getVariantLocationStock(
  variantId: string,
) {
  const locations = getWarehouseLocations();

  return getWarehouseStockPositions()
    .filter(
      (position) =>
        position.variantId === variantId &&
        position.quantity !== 0,
    )
    .map((position) => ({
      ...position,
      location:
        locations.find(
          (item) =>
            item.id === position.locationId,
        ) ?? null,
    }));
}

function changePositionQuantity(input: {
  productId: string;
  variantId: string;
  locationId: string;
  quantityDelta: number;
}) {
  const positions = getWarehouseStockPositions();
  const index = positions.findIndex(
    (position) =>
      position.variantId === input.variantId &&
      position.locationId === input.locationId,
  );

  if (index >= 0) {
    const nextQuantity =
      positions[index].quantity +
      input.quantityDelta;

    if (nextQuantity < 0) {
      throw new Error(
        "Onvoldoende voorraad op deze locatie.",
      );
    }

    positions[index] = {
      ...positions[index],
      quantity: nextQuantity,
      updatedAt: now(),
    };
  } else {
    if (input.quantityDelta < 0) {
      throw new Error(
        "Op deze locatie staat geen voorraad.",
      );
    }

    positions.push({
      id: createId("position"),
      productId: input.productId,
      variantId: input.variantId,
      locationId: input.locationId,
      quantity: input.quantityDelta,
      updatedAt: now(),
    });
  }

  savePositions(
    positions.filter(
      (position) => position.quantity !== 0,
    ),
  );
}

export function receiveWarehouseStock(input: {
  productId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  reason?: string;
}) {
  const quantity = Math.max(
    1,
    Math.floor(input.quantity),
  );

  changePositionQuantity({
    productId: input.productId,
    variantId: input.variantId,
    locationId: input.locationId,
    quantityDelta: quantity,
  });

  return {
    productId: input.productId,
    variantId: input.variantId,
    locationId: input.locationId,
    quantity,
    reason:
      input.reason?.trim() ||
      "Goederenontvangst",
    createdAt: now(),
  };
}

export function transferWarehouseStock(input: {
  productId: string;
  variantId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason?: string;
  userName?: string;
}) {
  const quantity = Math.max(
    1,
    Math.floor(input.quantity),
  );

  if (
    input.fromLocationId === input.toLocationId
  ) {
    throw new Error(
      "Kies twee verschillende locaties.",
    );
  }

  changePositionQuantity({
    productId: input.productId,
    variantId: input.variantId,
    locationId: input.fromLocationId,
    quantityDelta: -quantity,
  });

  changePositionQuantity({
    productId: input.productId,
    variantId: input.variantId,
    locationId: input.toLocationId,
    quantityDelta: quantity,
  });

  const transfer: WarehouseTransfer = {
    id: createId("transfer"),
    productId: input.productId,
    variantId: input.variantId,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    quantity,
    reason:
      input.reason?.trim() ||
      "Interne verplaatsing",
    userName: input.userName || "Daan",
    createdAt: now(),
  };

  save(transfersKey, [
    transfer,
    ...read<WarehouseTransfer>(
      transfersKey,
    ),
  ]);

  return transfer;
}

export function getWarehouseTransfers() {
  return read<WarehouseTransfer>(
    transfersKey,
  ).sort((first, second) =>
    second.createdAt.localeCompare(
      first.createdAt,
    ),
  );
}

function getSuggestedPutAwayLocationId(
  variantId: string,
) {
  const existing =
    getVariantLocationStock(variantId).find(
      (item) =>
        item.location?.type === "Pick" ||
        item.location?.type === "Bulk",
    );

  if (existing) {
    return existing.locationId;
  }

  return (
    getWarehouseLocations().find(
      (item) => item.type === "Pick",
    )?.id ??
    getWarehouseLocations()[0]?.id ??
    ""
  );
}

export function syncPutAwayTasks() {
  initializeWarehouseStock();

  const existing = read<PutAwayTask>(
    putAwayKey,
  );

  const existingKeys = new Set(
    existing.map(
      (task) =>
        `${task.receiptId}:${task.variantId}`,
    ),
  );

  const newTasks: PutAwayTask[] = [];

  getPurchaseReceipts().forEach(
    (receipt) => {
      receipt.lines.forEach((line) => {
        const key = `${receipt.id}:${line.variantId}`;

        if (existingKeys.has(key)) {
          return;
        }

        newTasks.push({
          id: createId("put-away"),
          receiptId: receipt.id,
          receiptNumber:
            receipt.receiptNumber,
          productId: line.productId,
          variantId: line.variantId,
          sku: line.sku,
          productName: line.productName,
          color: line.color,
          size: line.size,
          quantity: line.quantity,
          processedQuantity: 0,
          suggestedLocationId:
            getSuggestedPutAwayLocationId(
              line.variantId,
            ),
          status: "Open",
          createdAt: receipt.createdAt,
          updatedAt: now(),
        });
      });
    },
  );

  if (newTasks.length > 0) {
    save(putAwayKey, [
      ...existing,
      ...newTasks,
    ]);
  }

  return [...existing, ...newTasks];
}

export function getPutAwayTasks() {
  return syncPutAwayTasks().sort(
    (first, second) =>
      first.createdAt.localeCompare(
        second.createdAt,
      ),
  );
}

export function processPutAwayTask(input: {
  taskId: string;
  locationId: string;
  quantity: number;
}) {
  const tasks = getPutAwayTasks();
  const task = tasks.find(
    (item) => item.id === input.taskId,
  );

  if (!task) {
    throw new Error(
      "Put-away taak niet gevonden.",
    );
  }

  const remaining = Math.max(
    0,
    task.quantity - task.processedQuantity,
  );

  const quantity = Math.min(
    remaining,
    Math.max(1, Math.floor(input.quantity)),
  );

  if (quantity <= 0) {
    throw new Error(
      "Er is niets meer te verwerken.",
    );
  }

  changePositionQuantity({
    productId: task.productId,
    variantId: task.variantId,
    locationId: input.locationId,
    quantityDelta: quantity,
  });

  const updated = tasks.map((item) => {
    if (item.id !== task.id) {
      return item;
    }

    const processedQuantity =
      item.processedQuantity + quantity;

    return {
      ...item,
      processedQuantity,
      suggestedLocationId:
        input.locationId,
      status:
        processedQuantity >= item.quantity
          ? ("Voltooid" as const)
          : ("Deels verwerkt" as const),
      updatedAt: now(),
    };
  });

  save(putAwayKey, updated);

  return updated.find(
    (item) => item.id === task.id,
  )!;
}

function nextPickNumber(
  pickLists: PickList[],
) {
  const year = new Date().getFullYear();
  const highest = pickLists.reduce(
    (current, list) => {
      const match = list.pickNumber.match(
        /PK\d{4}-(\d+)/,
      );

      return match
        ? Math.max(
            current,
            Number(match[1]),
          )
        : current;
    },
    0,
  );

  return `PK${year}-${String(
    highest + 1,
  ).padStart(5, "0")}`;
}

function findBestPickLocation(
  variantId: string,
) {
  const positions =
    getVariantLocationStock(variantId)
      .filter(
        (item) =>
          item.quantity > 0 &&
          item.location?.active,
      )
      .sort((first, second) => {
        const typeScore = (
          type: WarehouseLocationType | undefined,
        ) =>
          type === "Pick"
            ? 0
            : type === "Bulk"
              ? 1
              : 2;

        const score =
          typeScore(first.location?.type) -
          typeScore(second.location?.type);

        if (score !== 0) {
          return score;
        }

        return (
          second.quantity - first.quantity
        );
      });

  return positions[0]?.locationId ?? "";
}

export function syncPickLists() {
  initializeWarehouseStock();

  const pickLists =
    read<PickList>(pickListsKey);

  const existingOrderIds = new Set(
    pickLists.map(
      (list) => list.salesOrderId,
    ),
  );

  const newLists: PickList[] = [];
  let allLists = [...pickLists];

  getSalesOrders()
    .filter(
      (order) =>
        (order.status === "Gereserveerd" ||
          order.status === "Gereed") &&
        !existingOrderIds.has(order.id),
    )
    .forEach((order) => {
      const timestamp = now();

      const list: PickList = {
        id: createId("pick-list"),
        pickNumber:
          nextPickNumber(allLists),
        salesOrderId: order.id,
        salesOrderNumber:
          order.orderNumber,
        customerName: order.customerName,
        requestedDeliveryDate:
          order.requestedDeliveryDate,
        status: "Open",
        lines: order.lines.map((line) => ({
          id: createId("pick-line"),
          salesOrderLineId: line.id,
          productId: line.productId,
          variantId: line.variantId,
          sku: line.sku,
          productName:
            line.productName,
          color: line.color,
          size: line.size,
          requiredQuantity: Math.max(
            0,
            line.quantity -
              line.deliveredQuantity,
          ),
          pickedQuantity: 0,
          locationId:
            findBestPickLocation(
              line.variantId,
            ),
        })),
        assignedTo: "",
        startedAt: "",
        completedAt: "",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      newLists.push(list);
      allLists = [...allLists, list];
    });

  if (newLists.length > 0) {
    save(pickListsKey, allLists);
  }

  return allLists;
}

export function getPickLists() {
  return syncPickLists().sort(
    (first, second) =>
      first.requestedDeliveryDate.localeCompare(
        second.requestedDeliveryDate,
      ),
  );
}

export function getPickListById(id: string) {
  return (
    getPickLists().find(
      (list) => list.id === id,
    ) ?? null
  );
}

export function startPickList(
  id: string,
  assignedTo = "Daan",
) {
  const lists = getPickLists().map(
    (list) =>
      list.id === id
        ? {
            ...list,
            status:
              list.status === "Open"
                ? ("Bezig" as const)
                : list.status,
            assignedTo,
            startedAt:
              list.startedAt || now(),
            updatedAt: now(),
          }
        : list,
  );

  save(pickListsKey, lists);

  return (
    lists.find((list) => list.id === id) ??
    null
  );
}

export function pickWarehouseLine(input: {
  pickListId: string;
  lineId: string;
  quantity: number;
  locationId?: string;
}) {
  const lists = getPickLists();
  const list = lists.find(
    (item) =>
      item.id === input.pickListId,
  );

  if (!list) {
    throw new Error(
      "Picklijst niet gevonden.",
    );
  }

  const line = list.lines.find(
    (item) => item.id === input.lineId,
  );

  if (!line) {
    throw new Error(
      "Pickregel niet gevonden.",
    );
  }

  const remaining = Math.max(
    0,
    line.requiredQuantity -
      line.pickedQuantity,
  );

  const quantity = Math.min(
    remaining,
    Math.max(1, Math.floor(input.quantity)),
  );

  const locationId =
    input.locationId ||
    line.locationId ||
    findBestPickLocation(line.variantId);

  if (!locationId) {
    throw new Error(
      `Geen picklocatie gevonden voor ${line.sku}.`,
    );
  }

  changePositionQuantity({
    productId: line.productId,
    variantId: line.variantId,
    locationId,
    quantityDelta: -quantity,
  });

  const updatedLists = lists.map(
    (item) => {
      if (item.id !== list.id) {
        return item;
      }

      const lines = item.lines.map(
        (currentLine) =>
          currentLine.id === line.id
            ? {
                ...currentLine,
                pickedQuantity:
                  currentLine.pickedQuantity +
                  quantity,
                locationId,
              }
            : currentLine,
      );

      const complete = lines.every(
        (currentLine) =>
          currentLine.pickedQuantity >=
          currentLine.requiredQuantity,
      );

      return {
        ...item,
        lines,
        status: complete
          ? ("Gepickt" as const)
          : ("Bezig" as const),
        completedAt: complete
          ? now()
          : item.completedAt,
        updatedAt: now(),
      };
    },
  );

  save(pickListsKey, updatedLists);

  return updatedLists.find(
    (item) => item.id === list.id,
  )!;
}

export function markPickListPacked(id: string) {
  const lists = getPickLists().map(
    (list) => {
      if (list.id !== id) {
        return list;
      }

      const complete = list.lines.every(
        (line) =>
          line.pickedQuantity >=
          line.requiredQuantity,
      );

      if (!complete) {
        throw new Error(
          "De picklijst is nog niet volledig gepickt.",
        );
      }

      return {
        ...list,
        status: "Verpakt" as const,
        updatedAt: now(),
      };
    },
  );

  save(pickListsKey, lists);

  return (
    lists.find((list) => list.id === id) ??
    null
  );
}

export function markPickListShipped(id: string) {
  const lists = getPickLists();
  const target = lists.find(
    (list) => list.id === id,
  );

  if (!target) {
    throw new Error(
      "Picklijst niet gevonden.",
    );
  }

  if (target.status !== "Verpakt") {
    throw new Error(
      "Pak de order eerst in.",
    );
  }

  const updatedLists = lists.map(
    (list) =>
      list.id === id
        ? {
            ...list,
            status:
              "Verzonden" as const,
            updatedAt: now(),
          }
        : list,
  );

  save(pickListsKey, updatedLists);

  const orders = getSalesOrders().map(
    (order) => {
      if (
        order.id !== target.salesOrderId
      ) {
        return order;
      }

      return {
        ...order,
        status: "Verzonden" as const,
        lines: order.lines.map((line) => ({
          ...line,
          deliveredQuantity:
            line.quantity,
          reservedQuantity: 0,
        })),
        updatedAt: now(),
      };
    },
  );

  saveSalesOrders(orders);

  return updatedLists.find(
    (list) => list.id === id,
  )!;
}

function nextCountNumber(
  counts: StockCount[],
) {
  const year = new Date().getFullYear();
  const highest = counts.reduce(
    (current, count) => {
      const match = count.countNumber.match(
        /VT\d{4}-(\d+)/,
      );

      return match
        ? Math.max(
            current,
            Number(match[1]),
          )
        : current;
    },
    0,
  );

  return `VT${year}-${String(
    highest + 1,
  ).padStart(5, "0")}`;
}

export function getStockCounts() {
  return read<StockCount>(
    stockCountsKey,
  ).sort((first, second) =>
    second.createdAt.localeCompare(
      first.createdAt,
    ),
  );
}

export function createStockCount(input: {
  locationId: string;
  assignedTo?: string;
  notes?: string;
}) {
  initializeWarehouseStock();

  const counts = getStockCounts();
  const products = getStoredProducts();
  const positions =
    getWarehouseStockPositions().filter(
      (position) =>
        position.locationId ===
        input.locationId,
    );

  const timestamp = now();

  const count: StockCount = {
    id: createId("stock-count"),
    countNumber:
      nextCountNumber(counts),
    locationId: input.locationId,
    status: "Concept",
    assignedTo:
      input.assignedTo || "",
    notes: input.notes || "",
    lines: positions.map((position) => {
      const product = products.find(
        (item) =>
          item.id === position.productId,
      );

      const variant =
        product?.variants.find(
          (item) =>
            item.id === position.variantId,
        );

      return {
        id: createId("count-line"),
        productId: position.productId,
        variantId: position.variantId,
        sku: variant?.sku || "",
        productName:
          product?.name ||
          "Onbekend artikel",
        color: variant?.color || "",
        size: variant?.size || "",
        locationId:
          input.locationId,
        expectedQuantity:
          position.quantity,
        countedQuantity: null,
      };
    }),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: "",
  };

  save(stockCountsKey, [
    count,
    ...counts,
  ]);

  return count;
}

export function updateStockCountLine(
  countId: string,
  lineId: string,
  countedQuantity: number,
) {
  const counts = getStockCounts().map(
    (count) =>
      count.id === countId
        ? {
            ...count,
            status:
              "In uitvoering" as const,
            lines: count.lines.map(
              (line) =>
                line.id === lineId
                  ? {
                      ...line,
                      countedQuantity:
                        Math.max(
                          0,
                          Math.floor(
                            countedQuantity,
                          ),
                        ),
                    }
                  : line,
            ),
            updatedAt: now(),
          }
        : count,
  );

  save(stockCountsKey, counts);

  return (
    counts.find(
      (count) => count.id === countId,
    ) ?? null
  );
}

export function completeStockCount(id: string) {
  const counts = getStockCounts();
  const count = counts.find(
    (item) => item.id === id,
  );

  if (!count) {
    throw new Error(
      "Voorraadtelling niet gevonden.",
    );
  }

  if (
    count.lines.some(
      (line) =>
        line.countedQuantity === null,
    )
  ) {
    throw new Error(
      "Vul alle getelde aantallen in.",
    );
  }

  const positions =
    getWarehouseStockPositions();

  count.lines.forEach((line) => {
    const positionIndex =
      positions.findIndex(
        (position) =>
          position.variantId ===
            line.variantId &&
          position.locationId ===
            line.locationId,
      );

    if (positionIndex >= 0) {
      positions[positionIndex] = {
        ...positions[positionIndex],
        quantity:
          line.countedQuantity ?? 0,
        updatedAt: now(),
      };
    }
  });

  savePositions(positions);

  const products = getStoredProducts();

  products.forEach((product) => {
    product.variants.forEach((variant) => {
      const total = positions
        .filter(
          (position) =>
            position.variantId ===
            variant.id,
        )
        .reduce(
          (sum, position) =>
            sum + position.quantity,
          0,
        );

      variant.physicalStock = total;
    });
  });

  saveProducts(products);

  const completed = counts.map(
    (item) =>
      item.id === id
        ? {
            ...item,
            status: "Afgerond" as const,
            updatedAt: now(),
            completedAt: now(),
          }
        : item,
  );

  save(stockCountsKey, completed);

  return completed.find(
    (item) => item.id === id,
  )!;
}

export function getWarehouseDashboard() {
  initializeWarehouseStock();

  const locations = getWarehouseLocations();
  const positions =
    getWarehouseStockPositions();
  const putAway = getPutAwayTasks();
  const picks = getPickLists();
  const counts = getStockCounts();

  return {
    locations: locations.filter(
      (item) => item.active,
    ).length,
    stockUnits: positions.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    ),
    openPutAway: putAway.filter(
      (item) =>
        item.status !== "Voltooid",
    ).length,
    openPickLists: picks.filter(
      (item) =>
        item.status !== "Verzonden",
    ).length,
    activeCounts: counts.filter(
      (item) =>
        item.status !== "Afgerond",
    ).length,
  };
}

export function findVariantByBarcodeOrSku(
  value: string,
) {
  const query = value
    .trim()
    .toLowerCase();

  if (!query) {
    return null;
  }

  for (const product of getStoredProducts()) {
    for (const variant of product.variants) {
      if (
        variant.sku.toLowerCase() === query
      ) {
        return { product, variant };
      }
    }
  }

  return null;
}
