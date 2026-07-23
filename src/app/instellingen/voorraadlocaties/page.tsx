"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createWarehouseLocation,
  deleteWarehouseLocation,
  getWarehouseLocations,
  getWarehouseStockPositions,
  updateWarehouseLocation,
  type WarehouseLocation,
  type WarehouseLocationType,
} from "@/lib/warehouse";
import styles from "./inventory-locations.module.css";

const locationTypes: WarehouseLocationType[] = [
  "Ontvangst",
  "Bulk",
  "Pick",
  "Pakstation",
  "Retour",
  "Quarantaine",
];

type LocationForm = {
  code: string;
  name: string;
  warehouse: string;
  zone: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  type: WarehouseLocationType;
  active: boolean;
  capacity: number;
};

const emptyForm: LocationForm = {
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
};

export default function InventoryLocationsSettingsPage() {
  const [locations, setLocations] = useState<
    WarehouseLocation[]
  >([]);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [form, setForm] =
    useState<LocationForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    const query = search.trim().toLowerCase();

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

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function startEdit(location: WarehouseLocation) {
    setEditingId(location.id);
    setForm({
      code: location.code,
      name: location.name,
      warehouse: location.warehouse,
      zone: location.zone,
      aisle: location.aisle,
      rack: location.rack,
      shelf: location.shelf,
      bin: location.bin,
      type: location.type,
      active: location.active,
      capacity: location.capacity,
    });
    setError("");
  }

  function saveLocation() {
    try {
      if (editingId) {
        updateWarehouseLocation(editingId, {
          ...form,
          code: form.code.trim().toUpperCase(),
          name:
            form.name.trim() ||
            form.code.trim().toUpperCase(),
        });
        setMessage("Voorraadlocatie bijgewerkt.");
      } else {
        createWarehouseLocation(form);
        setMessage("Voorraadlocatie toegevoegd.");
      }

      setError("");
      setEditingId(null);
      setForm(emptyForm);
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Opslaan is niet gelukt.",
      );
    }
  }

  function removeLocation(location: WarehouseLocation) {
    const confirmed = window.confirm(
      `Voorraadlocatie ${location.code} verwijderen?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      deleteWarehouseLocation(location.id);
      setMessage("Voorraadlocatie verwijderd.");
      setError("");
      reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Verwijderen is niet gelukt.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="Voorraadlocaties"
        description="Voeg locaties toe, wijzig namen en codes of verwijder lege, ongebruikte locaties."
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={startCreate}
          >
            + Nieuwe locatie
          </button>
        }
      />

      {message && (
        <div className={styles.success}>
          ✓ {message}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          ! {error}
        </div>
      )}

      <section className={styles.grid}>
        <article className="content-card">
          <div className="content-card-toolbar">
            <div className="table-search">
              <span>⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Zoek op code, naam of type..."
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Naam</th>
                  <th>Type</th>
                  <th>Magazijn</th>
                  <th className="table-number">
                    Voorraad
                  </th>
                  <th>Status</th>
                  <th />
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
                      <td>{location.type}</td>
                      <td>{location.warehouse}</td>
                      <td className="table-number">
                        {stock}
                      </td>
                      <td>
                        {location.active
                          ? "Actief"
                          : "Inactief"}
                      </td>
                      <td className="table-number">
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(location)
                            }
                          >
                            Bewerken
                          </button>
                          <button
                            type="button"
                            className={styles.delete}
                            onClick={() =>
                              removeLocation(location)
                            }
                          >
                            Verwijderen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                {editingId
                  ? "Locatie bewerken"
                  : "Nieuwe locatie"}
              </h2>
              <p className="content-card-description">
                Locaties met voorraad of actieve
                taken kunnen niet worden verwijderd.
              </p>
            </div>
          </div>

          <div className={styles.form}>
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
                placeholder="RET-01"
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
                placeholder="Retour verkoopbaar"
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
                {locationTypes.map((type) => (
                  <option key={type}>
                    {type}
                  </option>
                ))}
              </select>
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

            <div className={styles.smallGrid}>
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
                <span>Plank/vak</span>
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
            </div>

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

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active:
                      event.target.checked,
                  }))
                }
              />
              Actieve voorraadlocatie
            </label>
          </div>

          <div className={styles.formActions}>
            {editingId && (
              <button
                type="button"
                className="button button-secondary"
                onClick={startCreate}
              >
                Annuleren
              </button>
            )}
            <button
              type="button"
              className="button button-primary"
              onClick={saveLocation}
            >
              Opslaan
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
