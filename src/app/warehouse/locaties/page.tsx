"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createWarehouseLocation,
  getWarehouseLocations,
  getWarehouseStockPositions,
  type WarehouseLocation,
  type WarehouseLocationType,
} from "@/lib/warehouse";
import styles from "./locations.module.css";

const types: WarehouseLocationType[] = [
  "Ontvangst",
  "Bulk",
  "Pick",
  "Pakstation",
  "Retour",
  "Quarantaine",
];

export default function WarehouseLocationsPage() {
  const [locations, setLocations] =
    useState<WarehouseLocation[]>([]);
  const [search, setSearch] =
    useState("");
  const [showForm, setShowForm] =
    useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    warehouse: "Hoofdmagazijn",
    zone: "",
    aisle: "",
    rack: "",
    shelf: "",
    bin: "",
    type: "Pick" as WarehouseLocationType,
    active: true,
    capacity: 500,
  });

  function reload() {
    setLocations(getWarehouseLocations());
  }

  useEffect(() => {
    reload();
  }, []);

  const positions = useMemo(
    () => getWarehouseStockPositions(),
    [locations],
  );

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return locations.filter(
      (location) =>
        !query ||
        [
          location.code,
          location.name,
          location.warehouse,
          location.zone,
          location.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [locations, search]);

  function createLocation() {
    try {
      createWarehouseLocation(form);
      setShowForm(false);
      setError("");
      setForm({
        code: "",
        name: "",
        warehouse: "Hoofdmagazijn",
        zone: "",
        aisle: "",
        rack: "",
        shelf: "",
        bin: "",
        type: "Pick",
        active: true,
        capacity: 500,
      });
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Locatie aanmaken is niet gelukt.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Warehouse"
        title="Magazijnlocaties"
        description="Beheer zones, gangpaden, stellingen, pickvakken en pakstations."
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={() => setShowForm(true)}
          >
            + Nieuwe locatie
          </button>
        }
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
              placeholder="Zoek locatie..."
            />
          </div>

          <div className={styles.resultCount}>
            {filtered.length} locaties
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Naam</th>
                <th>Magazijn</th>
                <th>Zone</th>
                <th>Type</th>
                <th className="table-number">
                  Voorraad
                </th>
                <th className="table-number">
                  Capaciteit
                </th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((location) => {
                const stock = positions
                  .filter(
                    (position) =>
                      position.locationId ===
                      location.id,
                  )
                  .reduce(
                    (total, position) =>
                      total +
                      position.quantity,
                    0,
                  );

                return (
                  <tr key={location.id}>
                    <td className="table-primary">
                      {location.code}
                    </td>
                    <td>{location.name}</td>
                    <td>{location.warehouse}</td>
                    <td>
                      {location.zone || "—"}
                    </td>
                    <td>{location.type}</td>
                    <td className="table-number">
                      {stock}
                    </td>
                    <td className="table-number">
                      {location.capacity}
                    </td>
                    <td>
                      {location.active
                        ? "Actief"
                        : "Inactief"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowForm(false);
            }
          }}
        >
          <section className={styles.dialog}>
            <header>
              <div>
                <span>Warehouse</span>
                <h2>Nieuwe locatie</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                ×
              </button>
            </header>

            <div className={styles.formGrid}>
              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <label>
                <span>Locatiecode</span>
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  placeholder="A-01-01"
                />
              </label>

              <label>
                <span>Naam</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Magazijn</span>
                <input
                  value={form.warehouse}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      warehouse:
                        event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Type</span>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target
                        .value as WarehouseLocationType,
                    }))
                  }
                >
                  {types.map((type) => (
                    <option key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Zone</span>
                <input
                  value={form.zone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      zone: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Gangpad</span>
                <input
                  value={form.aisle}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      aisle: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Stelling</span>
                <input
                  value={form.rack}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rack: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Plank</span>
                <input
                  value={form.shelf}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      shelf: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Vak</span>
                <input
                  value={form.bin}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bin: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Capaciteit</span>
                <input
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      capacity: Number(
                        event.target.value,
                      ),
                    }))
                  }
                />
              </label>
            </div>

            <footer>
              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Annuleren
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={createLocation}
              >
                Locatie opslaan
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
