"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPickLists,
  getPutAwayTasks,
  getWarehouseDashboard,
  getWarehouseLocations,
  getWarehouseStockPositions,
} from "@/lib/warehouse";
import styles from "./warehouse.module.css";

export default function WarehousePage() {
  const [loaded, setLoaded] =
    useState(false);
  const [dashboard, setDashboard] =
    useState({
      locations: 0,
      stockUnits: 0,
      openPutAway: 0,
      openPickLists: 0,
      activeCounts: 0,
    });

  useEffect(() => {
    setDashboard(getWarehouseDashboard());
    setLoaded(true);
  }, []);

  const modules = [
    {
      title: "Locaties",
      description:
        "Beheer zones, stellingen, picklocaties en pakstations.",
      href: "/warehouse/locaties",
      metric: dashboard.locations,
      metricLabel: "actieve locaties",
      icon: "⌖",
    },
    {
      title: "Put-away",
      description:
        "Verwerk ontvangen goederen naar de juiste magazijnlocatie.",
      href: "/warehouse/put-away",
      metric: dashboard.openPutAway,
      metricLabel: "open taken",
      icon: "↓",
    },
    {
      title: "Picklijsten",
      description:
        "Pick gereserveerde verkooporders en maak ze klaar voor verzending.",
      href: "/warehouse/picklijsten",
      metric: dashboard.openPickLists,
      metricLabel: "open picklijsten",
      icon: "✓",
    },
    {
      title: "Scanner",
      description:
        "Mobiele scaninterface voor picken, verplaatsen en voorraadcontrole.",
      href: "/warehouse/scanner",
      metric: dashboard.stockUnits,
      metricLabel: "stuks geregistreerd",
      icon: "▥",
    },
    {
      title: "Voorraadtellingen",
      description:
        "Start cyclustellingen en verwerk voorraadverschillen.",
      href: "/warehouse/tellingen",
      metric: dashboard.activeCounts,
      metricLabel: "actieve tellingen",
      icon: "≡",
    },
    {
      title: "Voorraad",
      description:
        "Bekijk bestaande voorraad en voorraadcorrecties per SKU.",
      href: "/voorraad",
      metric: dashboard.stockUnits,
      metricLabel: "stuks op locatie",
      icon: "□",
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Operations"
        title="Warehouse"
        description="Beheer locaties, goederenontvangst, put-away, picklijsten, scanning en tellingen."
      />

      <section className={styles.metricGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Voorraad op locaties
          </div>
          <div className="metric-value">
            {loaded
              ? dashboard.stockUnits.toLocaleString(
                  "nl-NL",
                )
              : "—"}
          </div>
          <div className="metric-detail">
            stuks
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Open put-away
          </div>
          <div className="metric-value">
            {loaded
              ? dashboard.openPutAway
              : "—"}
          </div>
          <div className="metric-detail">
            ontvangstregels
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Open picklijsten
          </div>
          <div className="metric-value">
            {loaded
              ? dashboard.openPickLists
              : "—"}
          </div>
          <div className="metric-detail">
            verkooporders
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Actieve tellingen
          </div>
          <div className="metric-value">
            {loaded
              ? dashboard.activeCounts
              : "—"}
          </div>
          <div className="metric-detail">
            magazijnlocaties
          </div>
        </article>
      </section>

      <section className={styles.moduleGrid}>
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className={styles.moduleCard}
          >
            <div className={styles.moduleIcon}>
              {module.icon}
            </div>

            <div className={styles.moduleContent}>
              <h2>{module.title}</h2>
              <p>{module.description}</p>

              <div className={styles.moduleMetric}>
                <strong>
                  {module.metric.toLocaleString(
                    "nl-NL",
                  )}
                </strong>
                <span>{module.metricLabel}</span>
              </div>
            </div>

            <span className={styles.arrow}>
              →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
