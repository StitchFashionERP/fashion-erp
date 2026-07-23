"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  addMasterDataItem,
  deleteMasterDataItem,
  getMasterDataItems,
  masterDataLabels,
  subscribeToMasterData,
  updateMasterDataItem,
  type MasterDataEntity,
  type MasterDataItem,
} from "@/lib/master-data";

const entities = Object.keys(masterDataLabels) as MasterDataEntity[];

export default function StamgegevensPage() {
  const [entity, setEntity] = useState<MasterDataEntity>("brands");
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [search, setSearch] = useState("");

  function reload() {
    setItems(getMasterDataItems(entity, true));
  }

  useEffect(() => {
    reload();
    return subscribeToMasterData(reload);
  }, [entity]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query),
    );
  }, [items, search]);

  function createItem() {
    const name = window.prompt(`Naam voor nieuw stamgegeven`);
    if (!name) return;
    addMasterDataItem(entity, name);
    reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Instellingen"
        title="Stamgegevens"
        description="Beheer de centrale keuzelijsten die in heel STITCH worden gebruikt."
        action={
          <button type="button" className="button button-primary" onClick={createItem}>
            + Nieuw stamgegeven
          </button>
        }
      />

      <section
        className="content-card"
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          minHeight: 620,
          overflow: "hidden",
        }}
      >
        <aside
          style={{
            padding: 14,
            borderRight: "1px solid #dbe3ee",
            background: "#f7f9fc",
          }}
        >
          {entities.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setEntity(item);
                setSearch("");
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 4,
                border: 0,
                borderRadius: 4,
                background: entity === item ? "#e6f1fd" : "transparent",
                color: entity === item ? "#075ea8" : "#263b57",
                fontWeight: entity === item ? 700 : 500,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {masterDataLabels[item]}
            </button>
          ))}
        </aside>

        <div>
          <div className="content-card-toolbar">
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {masterDataLabels[entity]}
              </h2>
              <p style={{ margin: "4px 0 0", color: "#66758c", fontSize: 13 }}>
                {items.length} waarden
              </p>
            </div>

            <div className="table-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Zoeken..."
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Naam</th>
                  <th>Status</th>
                  <th className="table-number">Sortering</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        value={item.code}
                        onChange={(event) =>
                          updateMasterDataItem(entity, item.id, {
                            code: event.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          minHeight: 34,
                          border: "1px solid #d5deea",
                          borderRadius: 4,
                          padding: "6px 8px",
                        }}
                      />
                    </td>
                    <td>
                      <input
                        value={item.name}
                        onChange={(event) =>
                          updateMasterDataItem(entity, item.id, {
                            name: event.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          minHeight: 34,
                          border: "1px solid #d5deea",
                          borderRadius: 4,
                          padding: "6px 8px",
                        }}
                      />
                    </td>
                    <td>
                      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={item.active}
                          onChange={(event) =>
                            updateMasterDataItem(entity, item.id, {
                              active: event.target.checked,
                            })
                          }
                        />
                        {item.active ? "Actief" : "Inactief"}
                      </label>
                    </td>
                    <td className="table-number">
                      <input
                        type="number"
                        value={item.sortOrder}
                        onChange={(event) =>
                          updateMasterDataItem(entity, item.id, {
                            sortOrder: Number(event.target.value),
                          })
                        }
                        style={{
                          width: 82,
                          minHeight: 34,
                          border: "1px solid #d5deea",
                          borderRadius: 4,
                          padding: "6px 8px",
                        }}
                      />
                    </td>
                    <td className="table-number">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          if (window.confirm(`${item.name} verwijderen?`)) {
                            deleteMasterDataItem(entity, item.id);
                          }
                        }}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
