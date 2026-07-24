"use client";

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
  if (typeof window === "undefined") return defaultNumberSeries;

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return defaultNumberSeries;

  try {
    const parsed = JSON.parse(stored) as Partial<NumberSeries>[];
    return defaultNumberSeries.map((fallback) => {
      const found = parsed.find((item) => item.key === fallback.key);
      return normalizeSeries(found ?? {}, fallback);
    });
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaultNumberSeries;
  }
}

export function saveNumberSeries(series: NumberSeries[]) {
  if (typeof window === "undefined") return;

  const normalized = defaultNumberSeries.map((fallback) => {
    const found = series.find((item) => item.key === fallback.key);
    return normalizeSeries(found ?? {}, fallback);
  });

  window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(numberSeriesChangedEvent, { detail: normalized }));
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

export function claimNextNumber(key: NumberSeriesKey) {
  const all = getNumberSeries();
  const index = all.findIndex((item) => item.key === key);
  if (index < 0 || !all[index].active) return "";

  const claimed = formatNumber(all[index], all[index].nextNumber);
  all[index] = { ...all[index], nextNumber: all[index].nextNumber + 1 };
  saveNumberSeries(all);
  return claimed;
}
