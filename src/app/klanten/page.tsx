"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { createMasterId } from "@/lib/master-data";
import {
  getCustomers,
  saveCustomers,
  type Customer,
} from "@/lib/customers";
import { getPriceLists } from "@/lib/price-lists";
import {
  getCustomerHistoryCheck,
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
import styles from "./customers.module.css";

type StatusFilter =
  | "Actief"
  | "Gearchiveerd"
  | "Alles";

type CustomerForm = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  chamberOfCommerceNumber: string;
  customerType: CustomerType;
  vatNumber: string;
  vatNumberStatus: VatNumberStatus;
  transactionNature: "Goederen" | "Diensten";
  language: RelationLanguage;
  paymentDays: string;
  paymentDiscountPercentage: string;
  paymentDiscountDays: string;
  discountPercentage: string;
  priceListId: string;
};

const emptyForm: CustomerForm = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
  country: "Nederland",
  chamberOfCommerceNumber: "",
  customerType: "Zakelijk",
  vatNumber: "",
  vatNumberStatus: "Niet gecontroleerd",
  transactionNature: "Goederen",
  language: "Nederlands",
  paymentDays: "30",
  paymentDiscountPercentage: "0",
  paymentDiscountDays: "0",
  discountPercentage: "0",
  priceListId: "price-list-standard",
};

function customerToForm(
  customer: Customer,
): CustomerForm {
  return {
    companyName: customer.companyName,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    country: customer.country,
    chamberOfCommerceNumber:
      customer.chamberOfCommerceNumber || "",
    customerType: customer.customerType,
    vatNumber: customer.vatNumber,
    vatNumberStatus:
      customer.vatNumberStatus,
    transactionNature:
      customer.transactionNature,
    language: customer.language,
    paymentDays: String(customer.paymentDays),
    paymentDiscountPercentage: String(
      customer.paymentDiscountPercentage,
    ),
    paymentDiscountDays: String(
      customer.paymentDiscountDays,
    ),
    discountPercentage: String(
      customer.discountPercentage,
    ),
    priceListId:
      customer.priceListId ||
      "price-list-standard",
  };
}

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("Actief");
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] =
    useState<CustomerForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const priceLists = useMemo(
    () =>
      getPriceLists().filter(
        (item) => item.isActive,
      ),
    [],
  );

  useEffect(() => {
    setItems(getCustomers());
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
          item.customerNumber,
          item.companyName,
          item.contactPerson,
          item.email,
          item.city,
          item.country,
          item.chamberOfCommerceNumber,
          item.vatNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [items, search, statusFilter]);

  function commit(nextItems: Customer[]) {
    setItems(nextItems);
    saveCustomers(nextItems);
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

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm(customerToForm(customer));
    setShowForm(true);
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function updateForm(
    changes: Partial<CustomerForm>,
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
        "Bij een buitenlandse klant is het buitenlandse btw-nummer verplicht.",
      );
    }
  }

  function saveCustomer() {
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
                  city: form.city.trim(),
                  country: form.country,
                  chamberOfCommerceNumber:
                    form.chamberOfCommerceNumber
                      .trim()
                      .replace(/\s+/g, ""),
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
                    numberValue(
                      form.paymentDays,
                    ) || 30,
                  paymentDiscountPercentage:
                    numberValue(
                      form.paymentDiscountPercentage,
                    ),
                  paymentDiscountDays:
                    numberValue(
                      form.paymentDiscountDays,
                    ),
                  discountPercentage:
                    numberValue(
                      form.discountPercentage,
                    ),
                  priceListId:
                    form.priceListId,
                }
              : item,
          ),
        );

        setMessage("Klant bijgewerkt.");
      } else {
        const customerNumber = `KLT-${String(
          items.length + 1,
        ).padStart(4, "0")}`;

        commit([
          ...items,
          {
            id: createMasterId(
              "customer",
              form.companyName,
            ),
            customerNumber,
            companyName:
              form.companyName.trim(),
            contactPerson:
              form.contactPerson.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            country: form.country,
            chamberOfCommerceNumber:
              form.chamberOfCommerceNumber
                .trim()
                .replace(/\s+/g, ""),
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
              numberValue(form.paymentDays) ||
              30,
            paymentDiscountPercentage:
              numberValue(
                form.paymentDiscountPercentage,
              ),
            paymentDiscountDays:
              numberValue(
                form.paymentDiscountDays,
              ),
            discountPercentage:
              numberValue(
                form.discountPercentage,
              ),
            priceListId: form.priceListId,
            status: "Actief",
          },
        ]);

        setMessage("Klant toegevoegd.");
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

  function archiveCustomer(
    customer: Customer,
  ) {
    commit(
      items.map((item) =>
        item.id === customer.id
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
      customer.status === "Actief"
        ? "Klant gearchiveerd."
        : "Klant opnieuw geactiveerd.",
    );
    setError("");
  }

  function deleteCustomer(
    customer: Customer,
  ) {
    const history = getCustomerHistoryCheck(
      customer.id,
    );

    if (!history.canDelete) {
      setError(history.message);
      setMessage("");
      return;
    }

    const confirmed = window.confirm(
      `Klant ${customer.companyName} definitief verwijderen?`,
    );

    if (!confirmed) {
      return;
    }

    commit(
      items.filter(
        (item) => item.id !== customer.id,
      ),
    );

    setMessage("Klant verwijderd.");
    setError("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Relaties"
        title="Klanten"
        description="Beheer klanten, fiscale gegevens, taal en betaalafspraken."
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={startCreate}
          >
            + Nieuwe klant
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
                  ? "Klant bewerken"
                  : "Nieuwe klant"}
              </h2>
              <p className="content-card-description">
                Buitenlandse btw-gegevens worden
                alleen getoond wanneer het land niet
                Nederland is.
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
                <span>Plaats</span>
                <input
                  value={form.city}
                  onChange={(event) =>
                    updateForm({
                      city: event.target.value,
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

              {isNetherlands(form.country) && (
                <label>
                  <span>KvK-nummer</span>
                  <input
                    value={
                      form.chamberOfCommerceNumber
                    }
                    onChange={(event) =>
                      updateForm({
                        chamberOfCommerceNumber:
                          event.target.value,
                      })
                    }
                    placeholder="Bijv. 12345678"
                  />
                </label>
              )}

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
                <span>Type klant</span>
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
                    Een buitenlands btw-nummer is
                    verplicht voor deze relatie.
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
                    placeholder="Bijv. BE0123456789"
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

          <div className={styles.section}>
            <h3>Financieel</h3>

            <div className={styles.formGrid}>
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
                <span>Prijslijst</span>
                <select
                  value={form.priceListId}
                  onChange={(event) =>
                    updateForm({
                      priceListId:
                        event.target.value,
                    })
                  }
                >
                  {priceLists.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Standaardkorting (%)</span>
                <input
                  value={
                    form.discountPercentage
                  }
                  onChange={(event) =>
                    updateForm({
                      discountPercentage:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>
                  Betalingskorting (%)
                </span>
                <input
                  value={
                    form.paymentDiscountPercentage
                  }
                  onChange={(event) =>
                    updateForm({
                      paymentDiscountPercentage:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>
                  Betalingskorting binnen dagen
                </span>
                <input
                  type="number"
                  min={0}
                  value={
                    form.paymentDiscountDays
                  }
                  onChange={(event) =>
                    updateForm({
                      paymentDiscountDays:
                        event.target.value,
                    })
                  }
                />
              </label>
            </div>
          </div>

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
              onClick={saveCustomer}
            >
              {editingId
                ? "Wijzigingen opslaan"
                : "Klant opslaan"}
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
              placeholder="Zoek klant, land of btw-nummer..."
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
                <th>Klant</th>
                <th>Land</th>
                <th>KvK / BTW</th>
                <th>Taal</th>
                <th>Betaaltermijn</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{item.customerNumber}</td>
                  <td className="table-primary">
                    {item.companyName}
                    <div className={styles.meta}>
                      {item.contactPerson || "—"}
                    </div>
                  </td>
                  <td>{item.country}</td>
                  <td>
                    {isNetherlands(item.country)
                      ? item.chamberOfCommerceNumber ||
                        "—"
                      : item.vatNumber || "—"}

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
                          archiveCustomer(item)
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
                          deleteCustomer(item)
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
            Geen klanten gevonden.
          </div>
        )}
      </section>
    </div>
  );
}
