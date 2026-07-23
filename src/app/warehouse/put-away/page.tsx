"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPutAwayTasks,
  getWarehouseLocations,
  processPutAwayTask,
  type PutAwayTask,
} from "@/lib/warehouse";
import styles from "./put-away.module.css";

export default function PutAwayPage() {
  const [tasks, setTasks] = useState<
    PutAwayTask[]
  >([]);
  const [search, setSearch] =
    useState("");
  const [notification, setNotification] =
    useState("");
  const locations =
    getWarehouseLocations().filter(
      (location) =>
        location.active &&
        location.type !== "Ontvangst" &&
        location.type !== "Pakstation",
    );

  function reload() {
    setTasks(getPutAwayTasks());
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return tasks.filter(
      (task) =>
        task.status !== "Voltooid" &&
        (!query ||
          [
            task.receiptNumber,
            task.productName,
            task.sku,
            task.color,
            task.size,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)),
    );
  }, [tasks, search]);

  function process(
    task: PutAwayTask,
    locationId: string,
  ) {
    const remaining =
      task.quantity -
      task.processedQuantity;

    processPutAwayTask({
      taskId: task.id,
      locationId,
      quantity: remaining,
    });

    setNotification(
      `${remaining} stuks ${task.sku} zijn op locatie gezet.`,
    );
    reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Warehouse"
        title="Put-away"
        description="Verplaats ontvangen goederen vanaf ontvangst naar bulk- of picklocaties."
      />

      {notification && (
        <div className={styles.notification}>
          ✓ {notification}
        </div>
      )}

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
              placeholder="Zoek op ontvangst, SKU of artikel..."
            />
          </div>
          <div className={styles.count}>
            {filtered.length} open taken
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ontvangst</th>
                <th>Artikel</th>
                <th>Variant</th>
                <th className="table-number">
                  Ontvangen
                </th>
                <th className="table-number">
                  Open
                </th>
                <th>Voorgestelde locatie</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((task) => {
                const suggested =
                  locations.find(
                    (location) =>
                      location.id ===
                      task.suggestedLocationId,
                  );

                return (
                  <tr key={task.id}>
                    <td>{task.receiptNumber}</td>
                    <td className="table-primary">
                      {task.productName}
                      <div className={styles.meta}>
                        {task.sku}
                      </div>
                    </td>
                    <td>
                      {task.color} · {task.size}
                    </td>
                    <td className="table-number">
                      {task.quantity}
                    </td>
                    <td className="table-number">
                      {task.quantity -
                        task.processedQuantity}
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        defaultValue={
                          task.suggestedLocationId
                        }
                        id={`location-${task.id}`}
                      >
                        {locations.map(
                          (location) => (
                            <option
                              key={location.id}
                              value={location.id}
                            >
                              {location.code} ·{" "}
                              {location.name}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td className="table-number">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => {
                          const select =
                            document.getElementById(
                              `location-${task.id}`,
                            ) as HTMLSelectElement;

                          process(
                            task,
                            select.value,
                          );
                        }}
                      >
                        Volledig verwerken
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            Geen open put-away taken.
          </div>
        )}
      </section>
    </div>
  );
}
