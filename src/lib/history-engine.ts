"use client";

import { getSharedStateValue, setSharedStateValue } from "@/lib/shared-state-client";

export type HistoryEventType =
  | "SALES_ORDER_CREATED"
  | "SALES_ORDER_UPDATED"
  | "DELIVERY_POSTED"
  | "INVOICE_CREATED"
  | "RETURN_CREATED"
  | "CREDIT_NOTE_CREATED"
  | "PURCHASE_ORDER_CREATED"
  | "PURCHASE_RECEIPT_POSTED"
  | "STOCK_CHANGED";

export type HistoryEvent = {
  id: string;
  eventType: HistoryEventType;
  occurredAt: string;

  referenceId: string;
  referenceNumber: string;

  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;

  collection: string;
  category: string;
  garmentType: string;
  material: string;
  fit: string;
  color: string;
  colorFamily: string;
  size: string;

  supplierId: string;
  supplierName: string;
  customerId: string;
  customerName: string;
  country: string;

  quantity: number;
  netRevenue: number;
  costValue: number;
  stockAfter: number | null;

  metadata: Record<
    string,
    string | number | boolean | null
  >;
};

const storageKey =
  "stitch-erp-history-events-v1";

export const historyEngineSharedStateKeys = [storageKey] as const;

function createId() {
  return `history-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function getHistoryEvents() {
  const events = getSharedStateValue<HistoryEvent[]>(storageKey, []);
  return Array.isArray(events) ? events : [];
}

export function appendHistoryEvent(
  input: Omit<HistoryEvent, "id" | "occurredAt"> & {
    occurredAt?: string;
  },
) {
  const event: HistoryEvent = {
    ...input,
    id: createId(),
    occurredAt:
      input.occurredAt ||
      new Date().toISOString(),
  };

  const events = getHistoryEvents();
  setSharedStateValue(storageKey, [event, ...events]);

  return event;
}

export function appendHistoryEvents(
  inputs: Array<
    Omit<HistoryEvent, "id" | "occurredAt"> & {
      occurredAt?: string;
    }
  >,
) {
  const events = inputs.map((input) => ({
    ...input,
    id: createId(),
    occurredAt:
      input.occurredAt ||
      new Date().toISOString(),
  }));

  setSharedStateValue(storageKey, [
    ...events,
    ...getHistoryEvents(),
  ]);

  return events;
}


export function hasHistoryReference(
  eventType: HistoryEventType,
  referenceId: string,
) {
  return getHistoryEvents().some(
    (event) =>
      event.eventType === eventType &&
      event.referenceId === referenceId,
  );
}

export function appendHistoryEventsOnce(
  eventType: HistoryEventType,
  referenceId: string,
  inputs: Array<
    Omit<HistoryEvent, "id" | "occurredAt"> & {
      occurredAt?: string;
    }
  >,
) {
  if (
    hasHistoryReference(
      eventType,
      referenceId,
    )
  ) {
    return [];
  }

  return appendHistoryEvents(inputs);
}
