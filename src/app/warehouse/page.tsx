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
  getPickLists,
  getPutAwayTasks,
  getWarehouseDashboard,
  getWarehouseLocations,
  getWarehouseStockPositions,
  type PickList,
  type PutAwayTask,
  type WarehouseLocation,
  type WarehouseStockPosition,
} from "@/lib/warehouse";
import styles from "./warehouse.module.css";

type WarehouseSnapshot = {
  dashboard: ReturnType<
    typeof getWarehouseDashboard
  >;
  locations: WarehouseLocation[];
  stockPositions: WarehouseStockPosition[];
  putAwayTasks: PutAwayTask[];
  pickLists: PickList[];
};

const emptySnapshot: WarehouseSnapshot = {
  dashboard: {
    locations: 0,
    stockUnits: 0,
    openPutAway: 0,
    openPickLists: 0,
    activeCounts: 0,
  },
  locations: [],
  stockPositions: [],
  putAwayTasks: [],
  pickLists: [],
};

function formatNumber(value: number): string {
  return value.toLocaleString("nl-NL");
}

function getPickProgress(list: PickList) {
  const required = list.lines.reduce(
    (total, line) =>
      total + line.requiredQuantity,
    0,
  );

  const picked = list.lines.reduce(
    (total, line) =>
      total + line.pickedQuantity,
    0,
  );

  const percentage =
    required > 0
      ? Math.round((picked / required) * 100)
      : 0;

  return {
    required,
    picked,
    percentage,
  };
}

function getPickTone(
  status: PickList["status"],
) {
  if (status === "Verzonden") {
    return "success" as const;
  }

  if (
    status === "Gepickt" ||
    status === "Verpakt"
  ) {
    return "info" as const;
  }

  if (status === "Bezig") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function WarehousePage() {
  const [snapshot, setSnapshot] =
    useState<WarehouseSnapshot>(
      emptySnapshot,
    );
  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    setSnapshot({
      dashboard: getWarehouseDashboard(),
      locations: getWarehouseLocations(),
      stockPositions:
        getWarehouseStockPositions(),
      putAwayTasks: getPutAwayTasks(),
      pickLists: getPickLists(),
    });

    setLoaded(true);
  }, []);

  const openPutAwayTasks = useMemo(
    () =>
      snapshot.putAwayTasks.filter(
        (task) => task.status !== "Voltooid",
      ),
    [snapshot.putAwayTasks],
  );

  const openPickLists = useMemo(
    () =>
      snapshot.pickLists.filter(
        (list) =>
          list.status !== "Verzonden",
      ),
    [snapshot.pickLists],
  );

  const activeLocations = useMemo(
    () =>
      snapshot.locations.filter(
        (location) => location.active,
      ),
    [snapshot.locations],
  );

  const occupiedLocationIds = useMemo(
    () =>
      new Set(
        snapshot.stockPositions
          .filter(
            (position) =>
              position.quantity > 0,
          )
          .map(
            (position) =>
              position.locationId,
          ),
      ),
    [snapshot.stockPositions],
  );

  const occupiedLocations =
    activeLocations.filter((location) =>
      occupiedLocationIds.has(location.id),
    ).length;

  const capacityPercentage =
    activeLocations.length > 0
      ? Math.round(
          (occupiedLocations /
            activeLocations.length) *
            100,
        )
      : 0;

  const unitsToPutAway =
    openPutAwayTasks.reduce(
      (total, task) =>
        total +
        Math.max(
          task.quantity -
            task.processedQuantity,
          0,
        ),
      0,
    );

  const unitsToPick =
    openPickLists.reduce(
      (total, list) => {
        const progress = getPickProgress(list);

        return (
          total +
          Math.max(
            progress.required -
              progress.picked,
            0,
          )
        );
      },
      0,
    );

  const priorityPutAway =
    openPutAwayTasks.slice(0, 5);
  const priorityPickLists =
    openPickLists.slice(0, 5);

  const quickActions = [
    {
      title: "Scanner openen",
      description:
        "Scan artikelen, locaties en pickregels.",
      href: "/warehouse/scanner",
      icon: "▥",
    },
    {
      title: "Put-away verwerken",
      description:
        `${openPutAwayTasks.length} open taken · ${formatNumber(
          unitsToPutAway,
        )} stuks`,
      href: "/warehouse/put-away",
      icon: "↓",
    },
    {
      title: "Picklijsten openen",
      description:
        `${openPickLists.length} open lijsten · ${formatNumber(
          unitsToPick,
        )} stuks`,
      href: "/warehouse/picklijsten",
      icon: "✓",
    },
    {
      title: "Voorraad tellen",
      description:
        `${snapshot.dashboard.activeCounts} actieve tellingen`,
      href: "/warehouse/tellingen",
      icon: "≡",
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Operations"
        title="Warehouse"
        description="Dagelijkse cockpit voor ontvangst, put-away, picken, voorraad en tellingen."
        action={
          <Link
            href="/warehouse/scanner"
            className="button button-primary"
          >
            Scanner openen
          </Link>
        }
      />

      <section className={styles.metricGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Voorraad op locatie
          </div>
          <div className="metric-value">
            {loaded
              ? formatNumber(
                  snapshot.dashboard
                    .stockUnits,
                )
              : "—"}
          </div>
          <div className="metric-detail">
            geregistreerde stuks
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Nog op locatie te zetten
          </div>
          <div className="metric-value">
            {loaded
              ? formatNumber(
                  unitsToPutAway,
                )
              : "—"}
          </div>
          <div className="metric-detail">
            over{" "}
            {openPutAwayTasks.length} open taken
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Nog te picken
          </div>
          <div className="metric-value">
            {loaded
              ? formatNumber(unitsToPick)
              : "—"}
          </div>
          <div className="metric-detail">
            over{" "}
            {openPickLists.length} picklijsten
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Locatiebezetting
          </div>
          <div className="metric-value">
            {loaded
              ? `${capacityPercentage}%`
              : "—"}
          </div>
          <div className="metric-detail">
            {occupiedLocations} van{" "}
            {activeLocations.length} locaties
          </div>
        </article>
      </section>

      <section className={styles.moduleGrid}>
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={styles.moduleCard}
          >
            <div className={styles.moduleIcon}>
              {action.icon}
            </div>

            <div className={styles.moduleContent}>
              <h2>{action.title}</h2>
              <p>{action.description}</p>

              <div className={styles.moduleMetric}>
                <strong>Openen</strong>
                <span>
                  ga direct naar de werkstroom
                </span>
              </div>
            </div>

            <span className={styles.arrow}>
              →
            </span>
          </Link>
        ))}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        <section className="content-card">
          <div className="content-card-toolbar">
            <div>
              <strong>
                Prioriteit put-away
              </strong>
              <div
                style={{
                  marginTop: 3,
                  color:
                    "var(--text-secondary)",
                  fontSize: 11,
                }}
              >
                Ontvangen goederen die nog een
                magazijnlocatie nodig hebben.
              </div>
            </div>

            <Link
              href="/warehouse/put-away"
              className="table-link"
            >
              Alles bekijken
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ontvangst</th>
                  <th>Artikel</th>
                  <th className="table-number">
                    Open
                  </th>
                </tr>
              </thead>

              <tbody>
                {priorityPutAway.map(
                  (task) => (
                    <tr key={task.id}>
                      <td>
                        {task.receiptNumber}
                      </td>
                      <td className="table-primary">
                        {task.productName}
                        <div
                          style={{
                            marginTop: 2,
                            color:
                              "var(--text-muted)",
                            fontSize: 10,
                          }}
                        >
                          {task.sku}
                        </div>
                      </td>
                      <td className="table-number">
                        {formatNumber(
                          Math.max(
                            task.quantity -
                              task.processedQuantity,
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {priorityPutAway.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color:
                  "var(--text-secondary)",
                fontSize: 12,
              }}
            >
              Geen open put-awaytaken.
            </div>
          )}
        </section>

        <section className="content-card">
          <div className="content-card-toolbar">
            <div>
              <strong>
                Prioriteit picklijsten
              </strong>
              <div
                style={{
                  marginTop: 3,
                  color:
                    "var(--text-secondary)",
                  fontSize: 11,
                }}
              >
                Open verkooporders die klaarstaan
                om te picken.
              </div>
            </div>

            <Link
              href="/warehouse/picklijsten"
              className="table-link"
            >
              Alles bekijken
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Picklijst</th>
                  <th>Klant</th>
                  <th>Voortgang</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {priorityPickLists.map(
                  (list) => {
                    const progress =
                      getPickProgress(list);

                    return (
                      <tr key={list.id}>
                        <td>
                          <Link
                            href={`/warehouse/picklijsten/${list.id}`}
                            className="table-link"
                          >
                            {list.pickNumber}
                          </Link>
                        </td>
                        <td className="table-primary">
                          {list.customerName}
                        </td>
                        <td>
                          {progress.picked}/
                          {progress.required}{" "}
                          <span
                            style={{
                              color:
                                "var(--text-muted)",
                              fontSize: 10,
                            }}
                          >
                            (
                            {
                              progress.percentage
                            }
                            %)
                          </span>
                        </td>
                        <td>
                          <StatusBadge
                            label={list.status}
                            tone={getPickTone(
                              list.status,
                            )}
                          />
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {priorityPickLists.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color:
                  "var(--text-secondary)",
                fontSize: 12,
              }}
            >
              Geen open picklijsten.
            </div>
          )}
        </section>
      </div>

      <section
        className="content-card"
        style={{ marginTop: 18 }}
      >
        <div className="content-card-toolbar">
          <div>
            <strong>
              Magazijnoverzicht
            </strong>
            <div
              style={{
                marginTop: 3,
                color:
                  "var(--text-secondary)",
                fontSize: 11,
              }}
            >
              Status van locaties, voorraad en
              tellingen.
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Onderdeel</th>
                <th className="table-number">
                  Totaal
                </th>
                <th>Toelichting</th>
                <th />
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="table-primary">
                  Magazijnlocaties
                </td>
                <td className="table-number">
                  {formatNumber(
                    snapshot.dashboard.locations,
                  )}
                </td>
                <td>
                  {activeLocations.length} actieve
                  locaties
                </td>
                <td>
                  <Link
                    href="/warehouse/locaties"
                    className="table-link"
                  >
                    Beheren
                  </Link>
                </td>
              </tr>

              <tr>
                <td className="table-primary">
                  Voorraadposities
                </td>
                <td className="table-number">
                  {formatNumber(
                    snapshot.stockPositions
                      .length,
                  )}
                </td>
                <td>
                  {formatNumber(
                    snapshot.dashboard
                      .stockUnits,
                  )}{" "}
                  stuks geregistreerd
                </td>
                <td>
                  <Link
                    href="/voorraad"
                    className="table-link"
                  >
                    Bekijken
                  </Link>
                </td>
              </tr>

              <tr>
                <td className="table-primary">
                  Voorraadtellingen
                </td>
                <td className="table-number">
                  {formatNumber(
                    snapshot.dashboard
                      .activeCounts,
                  )}
                </td>
                <td>
                  actieve cyclustellingen
                </td>
                <td>
                  <Link
                    href="/warehouse/tellingen"
                    className="table-link"
                  >
                    Openen
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
