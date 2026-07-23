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
  type PickList,
} from "@/lib/warehouse";
import styles from "./pick-lists.module.css";

function date(value: string) {
  return value
    ? new Intl.DateTimeFormat("nl-NL").format(
        new Date(`${value}T12:00:00`),
      )
    : "—";
}

export default function PickListsPage() {
  const [lists, setLists] = useState<
    PickList[]
  >([]);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    setLists(getPickLists());
  }, []);

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return lists.filter(
      (list) =>
        !query ||
        [
          list.pickNumber,
          list.salesOrderNumber,
          list.customerName,
          list.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [lists, search]);

  function tone(status: PickList["status"]) {
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

  return (
    <div>
      <PageHeader
        eyebrow="Warehouse"
        title="Picklijsten"
        description="Pick gereserveerde verkooporders op locatie en maak ze klaar voor het pakstation."
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
              placeholder="Zoek picklijst, order of klant..."
            />
          </div>
          <div className={styles.count}>
            {filtered.length} picklijsten
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Picknummer</th>
                <th>Verkooporder</th>
                <th>Klant</th>
                <th>Leverdatum</th>
                <th className="table-number">
                  Regels
                </th>
                <th className="table-number">
                  Voortgang
                </th>
                <th>Toegewezen aan</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((list) => {
                const required =
                  list.lines.reduce(
                    (total, line) =>
                      total +
                      line.requiredQuantity,
                    0,
                  );

                const picked =
                  list.lines.reduce(
                    (total, line) =>
                      total +
                      line.pickedQuantity,
                    0,
                  );

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
                    <td>{list.salesOrderNumber}</td>
                    <td className="table-primary">
                      {list.customerName}
                    </td>
                    <td>
                      {date(
                        list.requestedDeliveryDate,
                      )}
                    </td>
                    <td className="table-number">
                      {list.lines.length}
                    </td>
                    <td className="table-number">
                      {picked}/{required}
                    </td>
                    <td>
                      {list.assignedTo || "—"}
                    </td>
                    <td>
                      <StatusBadge
                        label={list.status}
                        tone={tone(list.status)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            Geen picklijsten beschikbaar. Een
            picklijst ontstaat zodra een
            verkooporder volledig is gereserveerd.
          </div>
        )}
      </section>
    </div>
  );
}
