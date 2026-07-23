"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getGoodsReceiptDashboard,
  getGoodsReceiptHistory,
  getOpenGoodsReceiptOrders,
  type GoodsReceiptHistoryRow,
  type GoodsReceiptOrderRow,
} from "@/lib/goods-receipts";
import styles from "./goods-receipts.module.css";

type Tab = "openstaand" | "historie";

function formatCurrency(
  value: number,
  currency = "EUR",
) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T12:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "nl-NL",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTime(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "nl-NL",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default function GoodsReceiptsPage() {
  const [openOrders, setOpenOrders] =
    useState<GoodsReceiptOrderRow[]>([]);

  const [history, setHistory] =
    useState<GoodsReceiptHistoryRow[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<Tab>("openstaand");

  const [search, setSearch] =
    useState("");

  const [supplierFilter, setSupplierFilter] =
    useState("Alle leveranciers");

  const [notification, setNotification] =
    useState<string | null>(null);

  function reload() {
    setOpenOrders(
      getOpenGoodsReceiptOrders(),
    );

    setHistory(
      getGoodsReceiptHistory(),
    );

    setLoaded(true);
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setNotification(null);
      },
      3000,
    );

    return () =>
      window.clearTimeout(timeout);
  }, [notification]);

  const dashboard = useMemo(
    () => getGoodsReceiptDashboard(),
    [openOrders, history],
  );

  const suppliers = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...openOrders.map(
            (order) =>
              order.supplierName,
          ),
          ...history.map(
            (receipt) =>
              receipt.supplierName,
          ),
        ].filter(Boolean),
      ),
    ).sort((first, second) =>
      first.localeCompare(
        second,
        "nl",
      ),
    );
  }, [openOrders, history]);

  const filteredOpenOrders =
    useMemo(() => {
      const normalizedSearch = search
        .trim()
        .toLowerCase();

      return openOrders.filter(
        (order) => {
          const matchesSearch =
            !normalizedSearch ||
            order.orderNumber
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            order.supplierName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            order.collectionCode
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            order.supplierReference
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesSupplier =
            supplierFilter ===
              "Alle leveranciers" ||
            order.supplierName ===
              supplierFilter;

          return (
            matchesSearch &&
            matchesSupplier
          );
        },
      );
    }, [
      openOrders,
      search,
      supplierFilter,
    ]);

  const filteredHistory =
    useMemo(() => {
      const normalizedSearch = search
        .trim()
        .toLowerCase();

      return history.filter(
        (receipt) => {
          const matchesSearch =
            !normalizedSearch ||
            receipt.receiptNumber
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            receipt.purchaseOrderNumber
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            receipt.supplierName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            receipt.packingSlipNumber
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesSupplier =
            supplierFilter ===
              "Alle leveranciers" ||
            receipt.supplierName ===
              supplierFilter;

          return (
            matchesSearch &&
            matchesSupplier
          );
        },
      );
    }, [
      history,
      search,
      supplierFilter,
    ]);

  function resetFilters() {
    setSearch("");
    setSupplierFilter(
      "Alle leveranciers",
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Warehouse"
        title="Ontvangsten"
        description="Verwerk inkoopontvangsten handmatig of met een barcodescanner."
        action={
          <div
            className={
              styles.headerActions
            }
          >
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                reload();

                setNotification(
                  "Ontvangsten zijn vernieuwd.",
                );
              }}
            >
              ↻ Vernieuwen
            </button>

            <Link
              href="/ontvangsten/nieuw"
              className="button button-primary"
            >
              + Nieuwe ontvangst
            </Link>
          </div>
        }
      />

      {notification && (
        <div
          className={
            styles.notification
          }
        >
          <span>✓</span>
          {notification}
        </div>
      )}

      <section
        className={styles.metricGrid}
      >
        <article className="metric-card">
          <div className="metric-label">
            Openstaande orders
          </div>

          <div className="metric-value">
            {loaded
              ? dashboard.openOrders
              : "—"}
          </div>

          <div className="metric-detail">
            {loaded
              ? dashboard.incomingQuantity.toLocaleString(
                  "nl-NL",
                )
              : "—"}{" "}
            stuks te ontvangen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Deelleveringen
          </div>

          <div className="metric-value">
            {loaded
              ? dashboard.partialOrders
              : "—"}
          </div>

          <div className="metric-detail">
            orders gedeeltelijk ontvangen
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Achterstallig
          </div>

          <div className="metric-value">
            {loaded
              ? dashboard.overdueOrders
              : "—"}
          </div>

          <div className="metric-detail">
            leverdatum verstreken
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Vandaag ontvangen
          </div>

          <div className="metric-value">
            {loaded
              ? dashboard.receivedToday.toLocaleString(
                  "nl-NL",
                )
              : "—"}
          </div>

          <div className="metric-detail">
            {loaded
              ? dashboard.receiptsToday
              : "—"}{" "}
            ontvangstboekingen
          </div>
        </article>
      </section>

      <section className="content-card">
        <nav className={styles.tabs}>
          <button
            type="button"
            className={
              activeTab === "openstaand"
                ? styles.activeTab
                : undefined
            }
            onClick={() =>
              setActiveTab("openstaand")
            }
          >
            Te ontvangen
            <span>
              {openOrders.length}
            </span>
          </button>

          <button
            type="button"
            className={
              activeTab === "historie"
                ? styles.activeTab
                : undefined
            }
            onClick={() =>
              setActiveTab("historie")
            }
          >
            Ontvangsthistorie
            <span>{history.length}</span>
          </button>
        </nav>

        <div className={styles.toolbar}>
          <div
            className={
              styles.toolbarMain
            }
          >
            <div className={styles.search}>
              <span>⌕</span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder={
                  activeTab ===
                  "openstaand"
                    ? "Zoek op order, leverancier, collectie of referentie..."
                    : "Zoek op ontvangst, order, leverancier of pakbon..."
                }
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={supplierFilter}
              onChange={(event) =>
                setSupplierFilter(
                  event.target.value,
                )
              }
            >
              <option value="Alle leveranciers">
                Alle leveranciers
              </option>

              {suppliers.map(
                (supplier) => (
                  <option
                    key={supplier}
                    value={supplier}
                  >
                    {supplier}
                  </option>
                ),
              )}
            </select>

            {(search ||
              supplierFilter !==
                "Alle leveranciers") && (
              <button
                type="button"
                className={
                  styles.resetButton
                }
                onClick={resetFilters}
              >
                Wis filters
              </button>
            )}
          </div>

          <div
            className={
              styles.toolbarMeta
            }
          >
            {activeTab === "openstaand"
              ? filteredOpenOrders.length
              : filteredHistory.length}{" "}
            resultaten
          </div>
        </div>

        {activeTab === "openstaand" && (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Inkooporder</th>
                    <th>Leverancier</th>
                    <th>Collectie</th>
                    <th>Leverdatum</th>
                    <th className="table-number">
                      Besteld
                    </th>
                    <th className="table-number">
                      Ontvangen
                    </th>
                    <th className="table-number">
                      Open
                    </th>
                    <th>Voortgang</th>
                    <th className="table-number">
                      Open waarde
                    </th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredOpenOrders.map(
                    (order) => (
                      <tr
                        key={order.id}
                        className={
                          order.overdue
                            ? styles.overdueRow
                            : undefined
                        }
                      >
                        <td>
                          <Link
                            href={`/inkoop/${order.id}`}
                            className="table-link"
                          >
                            {
                              order.orderNumber
                            }
                          </Link>

                          {order.supplierReference && (
                            <div
                              className={
                                styles.secondaryText
                              }
                            >
                              Ref.{" "}
                              {
                                order.supplierReference
                              }
                            </div>
                          )}
                        </td>

                        <td className="table-primary">
                          {
                            order.supplierName
                          }
                        </td>

                        <td>
                          {order.collectionCode ||
                            "—"}
                        </td>

                        <td>
                          <div
                            className={
                              order.overdue
                                ? styles.overdueText
                                : undefined
                            }
                          >
                            {formatDate(
                              order.expectedDeliveryDate,
                            )}
                          </div>

                          {order.overdue && (
                            <div
                              className={
                                styles.secondaryDanger
                              }
                            >
                              Te laat
                            </div>
                          )}
                        </td>

                        <td className="table-number">
                          {
                            order.orderedQuantity
                          }
                        </td>

                        <td className="table-number">
                          {
                            order.receivedQuantity
                          }
                        </td>

                        <td className="table-number">
                          <strong>
                            {
                              order.remainingQuantity
                            }
                          </strong>
                        </td>

                        <td>
                          <div
                            className={
                              styles.progressCell
                            }
                          >
                            <div
                              className={
                                styles.progressHeader
                              }
                            >
                              <span>
                                {
                                  order.progress
                                }
                                %
                              </span>
                            </div>

                            <div
                              className={
                                styles.progressTrack
                              }
                            >
                              <div
                                className={
                                  styles.progressBar
                                }
                                style={{
                                  width: `${Math.min(
                                    100,
                                    order.progress,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="table-number table-primary">
                          {formatCurrency(
                            order.remainingValue,
                            order.currency,
                          )}
                        </td>

                        <td>
                          <StatusBadge
                            label={
                              order.status
                            }
                            tone={
                              order.status ===
                              "Deels ontvangen"
                                ? "warning"
                                : "info"
                            }
                          />
                        </td>

                        <td>
                          <Link
                            href={`/ontvangsten/nieuw?orderId=${order.id}`}
                            className={
                              styles.receiveButton
                            }
                          >
                            Ontvangen
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {loaded &&
              filteredOpenOrders.length ===
                0 && (
                <div
                  className={
                    styles.emptyState
                  }
                >
                  <div>✓</div>

                  <h2>
                    Geen openstaande
                    ontvangsten
                  </h2>

                  <p>
                    Er zijn geen inkooporders
                    die nog ontvangen moeten
                    worden.
                  </p>
                </div>
              )}
          </>
        )}

        {activeTab === "historie" && (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ontvangst</th>
                    <th>Inkooporder</th>
                    <th>Leverancier</th>
                    <th>Ontvangstdatum</th>
                    <th>Pakbon</th>
                    <th>Ontvangen door</th>
                    <th className="table-number">
                      Regels
                    </th>
                    <th className="table-number">
                      Aantal
                    </th>
                    <th>Verwerkt op</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredHistory.map(
                    (receipt) => (
                      <tr key={receipt.id}>
                        <td>
                          <span className="table-link">
                            {
                              receipt.receiptNumber
                            }
                          </span>
                        </td>

                        <td>
                          <Link
                            href={`/inkoop/${receipt.purchaseOrderId}`}
                            className="table-link"
                          >
                            {
                              receipt.purchaseOrderNumber
                            }
                          </Link>
                        </td>

                        <td className="table-primary">
                          {
                            receipt.supplierName
                          }
                        </td>

                        <td>
                          {formatDate(
                            receipt.receiptDate,
                          )}
                        </td>

                        <td>
                          {receipt.packingSlipNumber ||
                            "—"}
                        </td>

                        <td>
                          {receipt.receivedBy ||
                            "—"}
                        </td>

                        <td className="table-number">
                          {
                            receipt.lineCount
                          }
                        </td>

                        <td className="table-number table-primary">
                          {receipt.quantity}
                        </td>

                        <td>
                          {formatDateTime(
                            receipt.createdAt,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {loaded &&
              filteredHistory.length ===
                0 && (
                <div
                  className={
                    styles.emptyState
                  }
                >
                  <div>↓</div>

                  <h2>
                    Nog geen ontvangsten
                  </h2>

                  <p>
                    Ontvangsten verschijnen
                    hier zodra ze zijn
                    verwerkt.
                  </p>
                </div>
              )}
          </>
        )}

        {!loaded && (
          <div className={styles.emptyState}>
            <div>↻</div>
            <h2>Ontvangsten laden</h2>
          </div>
        )}
      </section>
    </div>
  );
}