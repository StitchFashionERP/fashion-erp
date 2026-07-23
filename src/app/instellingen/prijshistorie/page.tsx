"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPricingHistory,
  type PricingHistoryEntry,
} from "@/lib/pricing-history";
import styles from "./pricing-history.module.css";

const fieldLabels: Record<string, string> = {
  supplierPurchasePrice:
    "Inkoopprijs leverancier",
  shippingCosts: "Verzendkosten",
  otherCosts: "Overige kosten",
  totalCost: "Totale kostprijs",
  brandMarkup: "Merk-markup",
  salesPrice: "Verkoopprijs",
  retailerMarkup: "Retailer-markup",
  recommendedRetailPrice:
    "Adviesverkoopprijs",
};

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatValue(
  field: string,
  value: number | undefined,
) {
  if (typeof value !== "number") {
    return "—";
  }

  if (
    field === "brandMarkup" ||
    field === "retailerMarkup"
  ) {
    return `${value.toLocaleString("nl-NL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}x`;
  }

  return money(value);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PricingHistoryPage() {
  const [entries, setEntries] = useState<
    PricingHistoryEntry[]
  >([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setEntries(getPricingHistory());
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter((entry) =>
      [
        entry.productCode,
        entry.productName,
        entry.changedBy,
        ...entry.changedFields.map(
          (field) => fieldLabels[field] || field,
        ),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  return (
    <div>
      <PageHeader
        eyebrow="Pricing Engine"
        title="Prijshistorie"
        description="Bekijk wie prijzen en markups heeft gewijzigd en wat er precies veranderde."
      />

      <section className="content-card">
        <div className="content-card-toolbar">
          <div className="table-search">
            <span>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Zoek op artikel, gebruiker of prijsveld..."
            />
          </div>

          <div className={styles.resultCount}>
            {filtered.length} wijzigingen
          </div>
        </div>

        <div className={styles.timeline}>
          {filtered.map((entry) => (
            <article
              key={entry.id}
              className={styles.entry}
            >
              <div className={styles.marker} />

              <div className={styles.entryBody}>
                <header
                  className={styles.entryHeader}
                >
                  <div>
                    <strong>
                      {entry.productCode} ·{" "}
                      {entry.productName}
                    </strong>
                    <span>
                      {dateTime(entry.createdAt)} ·{" "}
                      {entry.changedBy}
                    </span>
                  </div>

                  <span className={styles.action}>
                    {entry.action === "created"
                      ? "Aangemaakt"
                      : entry.action ===
                          "targets-applied"
                        ? "Targets toegepast"
                        : "Bijgewerkt"}
                  </span>
                </header>

                <div className={styles.changes}>
                  {entry.changedFields.map(
                    (field) => (
                      <div
                        key={field}
                        className={
                          styles.changeRow
                        }
                      >
                        <span>
                          {fieldLabels[field] ||
                            field}
                        </span>

                        <div>
                          <del>
                            {formatValue(
                              field,
                              entry.before?.[
                                field as keyof typeof entry.before
                              ],
                            )}
                          </del>

                          <span>→</span>

                          <strong>
                            {formatValue(
                              field,
                              entry.after[
                                field as keyof typeof entry.after
                              ],
                            )}
                          </strong>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            Geen prijswijzigingen gevonden.
          </div>
        )}
      </section>
    </div>
  );
}
