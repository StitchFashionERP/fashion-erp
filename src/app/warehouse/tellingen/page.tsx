"use client";

import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  completeStockCount,
  createStockCount,
  getStockCounts,
  getWarehouseLocations,
  updateStockCountLine,
  type StockCount,
} from "@/lib/warehouse";
import styles from "./stock-counts.module.css";

export default function StockCountsPage() {
  const [counts, setCounts] = useState<
    StockCount[]
  >([]);
  const [selected, setSelected] =
    useState<StockCount | null>(null);
  const [locationId, setLocationId] =
    useState("");
  const [error, setError] = useState("");
  const locations = getWarehouseLocations();

  function reload() {
    const next = getStockCounts();
    setCounts(next);

    if (selected) {
      setSelected(
        next.find(
          (item) =>
            item.id === selected.id,
        ) ?? null,
      );
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function createCount() {
    if (!locationId) {
      setError("Selecteer een locatie.");
      return;
    }

    const count = createStockCount({
      locationId,
      assignedTo: "Daan",
    });

    setSelected(count);
    setError("");
    reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Warehouse"
        title="Voorraadtellingen"
        description="Start cyclustellingen per locatie en verwerk verschillen naar de actuele voorraad."
        action={
          <div className={styles.createAction}>
            <select
              value={locationId}
              onChange={(event) =>
                setLocationId(event.target.value)
              }
            >
              <option value="">
                Selecteer locatie
              </option>
              {locations.map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.code} ·{" "}
                  {location.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="button button-primary"
              onClick={createCount}
            >
              Nieuwe telling
            </button>
          </div>
        }
      />

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <section className={styles.grid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Tellingen
              </h2>
            </div>
          </div>

          <div className={styles.countList}>
            {counts.map((count) => {
              const location =
                locations.find(
                  (item) =>
                    item.id ===
                    count.locationId,
                );

              return (
                <button
                  key={count.id}
                  type="button"
                  className={
                    selected?.id === count.id
                      ? styles.activeCount
                      : ""
                  }
                  onClick={() =>
                    setSelected(count)
                  }
                >
                  <div>
                    <strong>
                      {count.countNumber}
                    </strong>
                    <span>
                      {location?.code || "—"} ·{" "}
                      {count.lines.length} regels
                    </span>
                  </div>
                  <span>{count.status}</span>
                </button>
              );
            })}

            {counts.length === 0 && (
              <div className={styles.empty}>
                Nog geen tellingen.
              </div>
            )}
          </div>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                {selected
                  ? selected.countNumber
                  : "Selecteer een telling"}
              </h2>
              {selected && (
                <p className="content-card-description">
                  {selected.status} ·{" "}
                  {selected.assignedTo ||
                    "Niet toegewezen"}
                </p>
              )}
            </div>

            {selected &&
              selected.status !== "Afgerond" && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    try {
                      const completed =
                        completeStockCount(
                          selected.id,
                        );
                      setSelected(completed);
                      setError("");
                      reload();
                    } catch (caughtError) {
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Telling afronden is niet gelukt.",
                      );
                    }
                  }}
                >
                  Telling afronden
                </button>
              )}
          </div>

          {selected ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Artikel</th>
                    <th>Variant</th>
                    <th className="table-number">
                      Verwacht
                    </th>
                    <th className="table-number">
                      Geteld
                    </th>
                    <th className="table-number">
                      Verschil
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selected.lines.map(
                    (line) => {
                      const difference =
                        line.countedQuantity ===
                        null
                          ? null
                          : line.countedQuantity -
                            line.expectedQuantity;

                      return (
                        <tr key={line.id}>
                          <td>
                            {line.productName}
                            <div
                              className={
                                styles.meta
                              }
                            >
                              {line.sku}
                            </div>
                          </td>
                          <td>
                            {line.color} ·{" "}
                            {line.size}
                          </td>
                          <td className="table-number">
                            {
                              line.expectedQuantity
                            }
                          </td>
                          <td className="table-number">
                            <input
                              className={
                                styles.quantityInput
                              }
                              type="number"
                              min={0}
                              disabled={
                                selected.status ===
                                "Afgerond"
                              }
                              value={
                                line.countedQuantity ??
                                ""
                              }
                              onChange={(event) => {
                                const updated =
                                  updateStockCountLine(
                                    selected.id,
                                    line.id,
                                    Number(
                                      event.target
                                        .value,
                                    ),
                                  );

                                if (updated) {
                                  setSelected(
                                    updated,
                                  );
                                }
                              }}
                            />
                          </td>
                          <td className="table-number">
                            {difference === null
                              ? "—"
                              : difference > 0
                                ? `+${difference}`
                                : difference}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>
              Selecteer links een telling.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
