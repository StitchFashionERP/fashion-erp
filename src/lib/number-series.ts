"use client";

import {
  getSharedStateValue,
  setSharedStateValue,
} from "@/lib/shared-state-client";

export type NumberSeriesKey =
  | "article"
  | "salesOrder"
  | "purchaseOrder"
  | "invoice"
  | "creditNote"
  | "packingSlip"
  | "goodsReceipt"
  | "return";

export type NumberSeries = {
  key: NumberSeriesKey;
  label: string;
  prefix: string;
  separator: string;
  nextNumber: number;
  digits: number;
  active: boolean;
};

const storageKey = "stitch-number-series-v1";
export const numberSeriesSharedStateKeys = [storageKey] as const;
export const numberSeriesChangedEvent = "stitch-number-series-changed";

export const defaultNumberSeries: NumberSeries[] = [
  { key: "article", label: "Artikelen", prefix: "ART", separator: "", nextNumber: 1, digits: 5, active: true },
  { key: "salesOrder", label: "Verkooporders", prefix: "SO", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "purchaseOrder", label: "Inkooporders", prefix: "PO", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "invoice", label: "Facturen", prefix: "INV", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "creditNote", label: "Creditnota's", prefix: "CR", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "packingSlip", label: "Pakbonnen", prefix: "PK", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "goodsReceipt", label: "Goederenontvangsten", prefix: "GO", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "return", label: "Retouren", prefix: "RET", separator: "-", nextNumber: 1, digits: 5, active: true },
];

function normalizeSeries(input: Partial<NumberSeries>, fallback: NumberSeries): NumberSeries {
  const nextNumber = Number(input.nextNumber);
  const digits = Number(input.digits);

  return {
    ...fallback,
    ...input,
    key: fallback.key,
    label: fallback.label,
    prefix: String(input.prefix ?? fallback.prefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12),
    separator: String(input.separator ?? fallback.separator).slice(0, 3),
    nextNumber: Number.isInteger(nextNumber) && nextNumber > 0 ? nextNumber : fallback.nextNumber,
    digits: Number.isInteger(digits) ? Math.min(Math.max(digits, 1), 10) : fallback.digits,
    active: input.active ?? fallback.active,
  };
}

export function getNumberSeries(): NumberSeries[] {
  const stored = getSharedStateValue<Partial<NumberSeries>[]>(
    storageKey,
    defaultNumberSeries,
  );

  return defaultNumberSeries.map((fallback) => {
    const found = stored.find((item) => item.key === fallback.key);
    return normalizeSeries(found ?? {}, fallback);
  });
}

export function saveNumberSeries(series: NumberSeries[]) {
  const normalized = defaultNumberSeries.map((fallback) => {
    const found = series.find((item) => item.key === fallback.key);
    return normalizeSeries(found ?? {}, fallback);
  });

  setSharedStateValue(storageKey, normalized);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(numberSeriesChangedEvent, { detail: normalized }),
    );
  }
}

export function resetNumberSeries() {
  saveNumberSeries(defaultNumberSeries);
  return defaultNumberSeries;
}

export function formatNumber(series: Pick<NumberSeries, "prefix" | "separator" | "digits">, value: number) {
  const numericPart = String(Math.max(0, Math.trunc(value))).padStart(series.digits, "0");
  return `${series.prefix}${series.prefix ? series.separator : ""}${numericPart}`;
}

export function peekNextNumber(key: NumberSeriesKey) {
  const series = getNumberSeries().find((item) => item.key === key);
  return series ? formatNumber(series, series.nextNumber) : "";
}

export async function claimNextNumber(key: NumberSeriesKey): Promise<string> {
  const response = await fetch("/api/number-series/claim", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  const body = (await response.json().catch(() => null)) as
    | { number?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error || "Het volgende nummer kon niet worden uitgegeven.");
  }

  if (!body?.number) {
    throw new Error("De nummerreeks is niet actief of bestaat niet.");
  }

  await hydrateNumberSeries();
  return body.number;
}

export async function hydrateNumberSeries() {
  const { hydrateSharedState } = await import("@/lib/shared-state-client");
  await hydrateSharedState(numberSeriesSharedStateKeys);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(numberSeriesChangedEvent, { detail: getNumberSeries() }),
    );
  }
}
