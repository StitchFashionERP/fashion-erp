"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createMasterId,
  getSuppliers,
  saveSuppliers,
  type Supplier,
} from "@/lib/master-data";
import {
  getSupplierHistoryCheck,
} from "@/lib/relation-history";
import {
  relationLanguages,
  type RelationLanguage,
} from "@/lib/language";
import {
  commonCountries,
  isNetherlands,
  viesCheckUrl,
  type CustomerType,
  type VatNumberStatus,
} from "@/lib/vat-engine";
import styles from "./suppliers.module.css";

type StatusFilter =
  | "Actief"
  | "Gearchiveerd"
  | "Alles";

type SupplierForm = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  customerType: CustomerType;
  vatNumber: string;
  vatNumberStatus: VatNumberStatus;
  transactionNature: "Goederen" | "Diensten";
  language: RelationLanguage;
  paymentDays: string;
};

const emptyForm: SupplierForm = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  country: "Nederland",
  customerType: "Zakelijk",
  vatNumber: "",
  vatNumberStatus: "Niet gecontroleerd",
  transactionNature: "Goederen",
  language: "Nederlands",
  paymentDays: "30",
};

function supplierToForm(
  supplier: Supplier,
): SupplierForm {
  return {
    companyName: supplier.companyName,
    contactPerson: supplier.contactPerson,
    email: supplier.email,
    phone: supplier.phone,
    country: supplier.country,
    customerType: supplier.customerType,
    vatNumber: supplier.vatNumber,
    vatNumberStatus:
      supplier.vatNumberStatus,
    transactionNature:
      supplier.transactionNature,
    language: supplier.language,
    paymentDays: String(supplier.paymentDays),
  };
}

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("Actief");
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] =
    useState<SupplierForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(getSuppliers());
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const statusMatches =
        statusFilter === "Alles" ||
        (statusFilter === "Actief" &&
          item.status === "Actief") ||
        (statusFilter === "Gearchiveerd" &&
          item.status === "Inactief");

      if (!statusMatches) {
        return false;
      }

      return (
        !query ||
        [
          item.supplierNumber,
          item.companyName,
          item.contactPerson,
          item.email,
          item.country,
          item.vatNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [items, search, statusFilter]);

  function commit(nextItems: Supplier[]) {
    setItems(nextItems);
    saveSuppliers(nextItems);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setError("");
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm(supplierToForm(supplier));
    setShowForm(true);
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function updateForm(
    changes: Partial<SupplierForm>,
  ) {
    setForm((current) => ({
      ...current,
      ...changes,
    }));
  }

  function validate() {
    if (!form.companyName.trim()) {
      throw new Error(
        "Vul een bedrijfsnaam in.",
      );
    }

    if (
      !isNetherlands(form.country) &&
      !form.vatNumber.trim()
    ) {
      throw new Error(
        "Bij een buitenlandse leverancier is het buitenlandse btw-nummer verplicht.",
      );
    }
  }

  function saveSupplier() {
    try {
      validate();

      const checkedAt =
        form.vatNumberStatus === "Geldig"
          ? new Date()
              .toISOString()
              .slice(0, 10)
          : "";

      if (editingId) {
        commit(
          items.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  companyName:
                    form.companyName.trim(),
                  contactPerson:
                    form.contactPerson.trim(),
                  email: form.email.trim(),
                  phone: form.phone.trim(),
                  country: form.country,
                  customerType:
                    form.customerType,
                  vatNumber: form.vatNumber
                    .trim()
                    .toUpperCase(),
                  vatNumberStatus:
                    form.vatNumberStatus,
                  vatNumberCheckedAt:
                    checkedAt,
                  transactionNature:
                    form.transactionNature,
                  language: form.language,
                  paymentDays:
                    Number(form.paymentDays) ||
                    30,
                }
              : item,
          ),
        );

        setMessage(
          "Leverancier bijgewerkt.",
        );
      } else {
        const supplierNumber = `LEV-${String(
          items.length + 1,
        ).padStart(4, "0")}`;

        commit([
          ...items,
          {
            id: createMasterId(
              "supplier",
              form.companyName,
            ),
            supplierNumber,
            companyName:
              form.companyName.trim(),
            contactPerson:
              form.contactPerson.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            country: form.country,
            customerType:
              form.customerType,
            vatNumber: form.vatNumber
              .trim()
              .toUpperCase(),
            vatNumberStatus:
              form.vatNumberStatus,
            vatNumberCheckedAt: checkedAt,
            transactionNature:
              form.transactionNature,
            language: form.language,
            paymentDays:
              Number(form.paymentDays) || 30,
            status: "Actief",
          },
        ]);

        setMessage(
          "Leverancier toegevoegd.",
        );
      }

      resetForm();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Opslaan is niet gelukt.",
      );
    }
  }

  function archiveSupplier(
    supplier: Supplier,
  ) {
    commit(
      items.map((item) =>
        item.id === supplier.id
          ? {
              ...item,
              status:
                item.status === "Actief"
                  ? "Inactief"
                  : "Actief",
            }
          : item,
      ),
    );

    setMessage(
      supplier.status === "Actief"
        ? "Leverancier gearchiveerd."
        : "Leverancier opnieuw geactiveerd.",
    );
    setError("");
  }

  function deleteSupplier(
    supplier: Supplier,
  ) {
    const history = getSupplierHistoryCheck(
      supplier.id,
    );

    if (!history.canDelete) {
      setError(history.message);
      setMessage("");
      return;
    }

    const confirmed = window.confirm(
      `Leverancier ${supplier.companyName} definitief verwijderen?`,
    );

    if (!confirmed) {
      return;
    }

    commit(
      items.filter(
        (item) => item.id !== supplier.id,
      ),
    );

    setMessage("Leverancier verwijderd.");
    setError("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Relaties"
        title="Leveranciers"
        description="Beheer leveranciers, fiscale gegevens, taal en inkoopafspraken."
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={startCreate}
          >
            + Nieuwe leverancier
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

      {showForm && (
        <section
          className={`content-card ${styles.formCard}`}
        >
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                {editingId
                  ? "Leverancier bewerken"
                  : "Nieuwe leverancier"}
              </h2>
              <p className="content-card-description">
                Bewerk dezelfde gegevens als bij
                het aanmaken van een leverancier.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Algemeen</h3>

            <div className={styles.formGrid}>
              <label>
                <span>Bedrijfsnaam</span>
                <input
                  value={form.companyName}
                  onChange={(event) =>
                    updateForm({
                      companyName:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Contactpersoon</span>
                <input
                  value={form.contactPerson}
                  onChange={(event) =>
                    updateForm({
                      contactPerson:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>E-mailadres</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm({
                      email: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Telefoon</span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    updateForm({
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Land</span>
                <select
                  value={form.country}
                  onChange={(event) =>
                    updateForm({
                      country:
                        event.target.value,
                      vatNumberStatus:
                        "Niet gecontroleerd",
                    })
                  }
                >
                  {commonCountries.map(
                    (country) => (
                      <option key={country}>
                        {country}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>Taal</span>
                <select
                  value={form.language}
                  onChange={(event) =>
                    updateForm({
                      language:
                        event.target
                          .value as RelationLanguage,
                    })
                  }
                >
                  {relationLanguages.map(
                    (language) => (
                      <option key={language}>
                        {language}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>Betaaltermijn</span>
                <input
                  type="number"
                  min={0}
                  value={form.paymentDays}
                  onChange={(event) =>
                    updateForm({
                      paymentDays:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Type leverancier</span>
                <select
                  value={form.customerType}
                  onChange={(event) =>
                    updateForm({
                      customerType:
                        event.target
                          .value as CustomerType,
                    })
                  }
                >
                  <option>Zakelijk</option>
                  <option>Particulier</option>
                </select>
              </label>
            </div>
          </div>

          {!isNetherlands(form.country) && (
            <div
              className={`${styles.section} ${styles.foreignSection}`}
            >
              <div
                className={styles.sectionHeader}
              >
                <div>
                  <h3>
                    Buitenlandse btw-gegevens
                  </h3>
                  <p>
                    Nodig voor een correcte
                    inkoop- en btw-verwerking.
                  </p>
                </div>

                <a
                  href={viesCheckUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-secondary"
                >
                  Controleer via VIES ↗
                </a>
              </div>

              <div className={styles.formGrid}>
                <label>
                  <span>
                    Buitenlands btw-nummer *
                  </span>
                  <input
                    value={form.vatNumber}
                    onChange={(event) =>
                      updateForm({
                        vatNumber:
                          event.target.value,
                        vatNumberStatus:
                          "Niet gecontroleerd",
                      })
                    }
                    placeholder="Bijv. IT12345678901"
                  />
                </label>

                <label>
                  <span>Controle-status</span>
                  <select
                    value={
                      form.vatNumberStatus
                    }
                    onChange={(event) =>
                      updateForm({
                        vatNumberStatus:
                          event.target
                            .value as VatNumberStatus,
                      })
                    }
                  >
                    <option>
                      Niet gecontroleerd
                    </option>
                    <option>Geldig</option>
                    <option>Ongeldig</option>
                  </select>
                </label>

                <label>
                  <span>Transactietype</span>
                  <select
                    value={
                      form.transactionNature
                    }
                    onChange={(event) =>
                      updateForm({
                        transactionNature:
                          event.target.value as
                            | "Goederen"
                            | "Diensten",
                      })
                    }
                  >
                    <option>Goederen</option>
                    <option>Diensten</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetForm}
            >
              Annuleren
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={saveSupplier}
            >
              {editingId
                ? "Wijzigingen opslaan"
                : "Leverancier opslaan"}
            </button>
          </div>
        </section>
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
              placeholder="Zoek leverancier, land of btw-nummer..."
            />
          </div>

          <select
            className={styles.filter}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as StatusFilter,
              )
            }
          >
            <option>Actief</option>
            <option>Gearchiveerd</option>
            <option>Alles</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Leverancier</th>
                <th>Land</th>
                <th>BTW-nummer</th>
                <th>Taal</th>
                <th>Betaaltermijn</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{item.supplierNumber}</td>
                  <td className="table-primary">
                    {item.companyName}
                    <div className={styles.meta}>
                      {item.contactPerson || "—"}
                    </div>
                  </td>
                  <td>{item.country}</td>
                  <td>
                    {item.vatNumber || "—"}
                    {!isNetherlands(
                      item.country,
                    ) && (
                      <div className={styles.meta}>
                        {item.vatNumberStatus}
                      </div>
                    )}
                  </td>
                  <td>{item.language}</td>
                  <td>
                    {item.paymentDays} dagen
                  </td>
                  <td>
                    <StatusBadge
                      label={
                        item.status === "Actief"
                          ? "Actief"
                          : "Gearchiveerd"
                      }
                      tone={
                        item.status === "Actief"
                          ? "success"
                          : "neutral"
                      }
                    />
                  </td>
                  <td className="table-number">
                    <div
                      className={
                        styles.rowActions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(item)
                        }
                      >
                        Bewerken
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          archiveSupplier(item)
                        }
                      >
                        {item.status === "Actief"
                          ? "Archiveren"
                          : "Activeren"}
                      </button>

                      <button
                        type="button"
                        className={
                          styles.deleteAction
                        }
                        onClick={() =>
                          deleteSupplier(item)
                        }
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            Geen leveranciers gevonden.
          </div>
        )}
      </section>
    </div>
  );
}
