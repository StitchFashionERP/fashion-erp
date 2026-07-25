"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { createMasterId } from "@/lib/master-data";
import {
  deleteCustomerCloud,
  getCustomers,
  saveCustomerCloud,
  type Customer,
} from "@/lib/customers";
import { getCustomerHistoryCheck } from "@/lib/relation-history";
import {
  CustomerGeneralTab,
  type CustomerGeneralForm,
} from "./components/CustomerGeneralTab";
import styles from "./customers.module.css";

type StatusFilter = "Actief" | "Gearchiveerd" | "Alles";

const emptyForm: CustomerGeneralForm = {
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
};

function customerToForm(customer: Customer): CustomerGeneralForm {
  return {
    companyName: customer.companyName,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    country: customer.country,
    chamberOfCommerceNumber: customer.chamberOfCommerceNumber || "",
    customerType: customer.customerType,
    vatNumber: customer.vatNumber,
    vatNumberStatus: customer.vatNumberStatus,
    transactionNature: customer.transactionNature,
    language: customer.language,
  };
}

function createCustomerNumber(customers: Customer[]) {
  const highestNumber = customers.reduce((highest, customer) => {
    const numericPart = Number(
      customer.customerNumber.replace(/[^0-9]/g, ""),
    );

    return Number.isFinite(numericPart)
      ? Math.max(highest, numericPart)
      : highest;
  }, 0);

  return `KLT-${String(highestNumber + 1).padStart(4, "0")}`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerGeneralForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("Actief");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const editingCustomer = useMemo(
    () =>
      editingId
        ? customers.find((customer) => customer.id === editingId) || null
        : null,
    [customers, editingId],
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        if (statusFilter === "Alles") {
          return true;
        }

        if (statusFilter === "Actief") {
          return customer.status === "Actief";
        }

        return customer.status === "Inactief";
      })
      .filter((customer) => {
        if (!query) {
          return true;
        }

        return [
          customer.customerNumber,
          customer.companyName,
          customer.contactPerson,
          customer.email,
          customer.phone,
          customer.city,
          customer.country,
          customer.chamberOfCommerceNumber,
          customer.vatNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName, "nl"));
  }, [customers, search, statusFilter]);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      try {
        const result = await getCustomers();

        if (active) {
          setCustomers(result);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Klanten ophalen is niet gelukt.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      active = false;
    };
  }, []);

  function updateForm(changes: Partial<CustomerGeneralForm>) {
    setForm((current) => ({
      ...current,
      ...changes,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function startEdit(customer: Customer) {
    setForm(customerToForm(customer));
    setEditingId(customer.id);
    setShowForm(true);
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validateForm() {
    if (!form.companyName.trim()) {
      throw new Error("Vul een bedrijfsnaam in.");
    }

    if (
      form.customerType === "Zakelijk" &&
      form.country !== "Nederland" &&
      !form.vatNumber.trim()
    ) {
      throw new Error(
        "Vul bij een buitenlandse zakelijke klant een btw-nummer in.",
      );
    }
  }

  async function saveCustomer() {
    setMessage("");
    setError("");

    try {
      validateForm();
      setSaving(true);

      const customerId =
        editingCustomer?.id ||
        createMasterId("customer", form.companyName);

      const nextCustomer: Customer = {
        id: customerId,
        customerNumber:
          editingCustomer?.customerNumber ||
          createCustomerNumber(customers),
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: editingCustomer?.address || "",
        postalCode: editingCustomer?.postalCode || "",
        city: form.city.trim(),
        country: form.country,
        chamberOfCommerceNumber:
          form.chamberOfCommerceNumber.trim(),
        customerType: form.customerType,
        vatNumber: form.vatNumber.trim().toUpperCase(),
        vatNumberStatus: form.vatNumberStatus,
        vatNumberCheckedAt:
          form.vatNumberStatus === "Geldig"
            ? new Date().toISOString()
            : "",
        transactionNature: form.transactionNature,
        language: form.language,
        paymentDays: editingCustomer?.paymentDays ?? 30,
        paymentDiscountPercentage:
          editingCustomer?.paymentDiscountPercentage ?? 0,
        paymentDiscountDays:
          editingCustomer?.paymentDiscountDays ?? 0,
        discountPercentage:
          editingCustomer?.discountPercentage ?? 0,
        priceListId:
          editingCustomer?.priceListId ||
          "price-list-standard",
        status: editingCustomer?.status || "Actief",
      };

      const savedCustomer = await saveCustomerCloud(
        nextCustomer,
        (editingCustomer?.crm as
          | Record<string, unknown>
          | null
          | undefined) || undefined,
      );

      setCustomers((current) => {
        const exists = current.some(
          (customer) => customer.id === savedCustomer.id,
        );

        if (exists) {
          return current.map((customer) =>
            customer.id === savedCustomer.id
              ? savedCustomer
              : customer,
          );
        }

        return [...current, savedCustomer];
      });

      setEditingId(savedCustomer.id);
      setForm(customerToForm(savedCustomer));
      setShowForm(true);
      setMessage(
        editingCustomer
          ? "Klant is bijgewerkt."
          : "Klant is toegevoegd.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Opslaan is niet gelukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(customer: Customer) {
    setMessage("");
    setError("");

    try {
      const nextCustomer: Customer = {
        ...customer,
        status:
          customer.status === "Actief"
            ? "Inactief"
            : "Actief",
      };

      const savedCustomer = await saveCustomerCloud(
        nextCustomer,
        (customer.crm as
          | Record<string, unknown>
          | null
          | undefined) || undefined,
      );

      setCustomers((current) =>
        current.map((item) =>
          item.id === savedCustomer.id
            ? savedCustomer
            : item,
        ),
      );

      setMessage(
        savedCustomer.status === "Actief"
          ? "Klant is geactiveerd."
          : "Klant is gearchiveerd.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Status wijzigen is niet gelukt.",
      );
    }
  }

  async function removeCustomer(customer: Customer) {
    setMessage("");
    setError("");

    const history = getCustomerHistoryCheck(customer.id);

    if (!history.canDelete) {
      setError(history.message);
      return;
    }

    const confirmed = window.confirm(
      `Klant ${customer.companyName} definitief verwijderen?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomerCloud(customer.id);

      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id),
      );

      if (editingId === customer.id) {
        resetForm();
      }

      setMessage("Klant is verwijderd.");
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
        eyebrow="Relaties"
        title="Klanten"
        description="Beheer klanten en hun algemene relatiegegevens."
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
        <div className={styles.success}>✓ {message}</div>
      )}

      {error && (
        <div className={styles.error}>! {error}</div>
      )}

      {showForm && (
        <section
          className={`content-card ${styles.customerCard}`}
        >
          <div className={styles.customerHeader}>
            <div>
              <div className={styles.customerEyebrow}>
                {editingCustomer?.customerNumber ||
                  "Nieuwe relatie"}
              </div>

              <h2>
                {form.companyName || "Nieuwe klant"}
              </h2>

              <p>
                {editingCustomer
                  ? `${editingCustomer.country} · ${editingCustomer.customerType}`
                  : "Vul de klantgegevens in."}
              </p>
            </div>

            <div className={styles.headerActions}>
              {editingCustomer && (
                <StatusBadge
                  label={
                    editingCustomer.status === "Actief"
                      ? "Actief"
                      : "Gearchiveerd"
                  }
                  tone={
                    editingCustomer.status === "Actief"
                      ? "success"
                      : "neutral"
                  }
                />
              )}

              <button
                type="button"
                className="button button-secondary"
                onClick={resetForm}
              >
                Sluiten
              </button>
            </div>
          </div>

          <div className={styles.tabContent}>
            <CustomerGeneralTab
              form={form}
              updateForm={updateForm}
            />
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
              disabled={saving}
              onClick={() => void saveCustomer()}
            >
              {saving ? "Opslaan..." : "Klant opslaan"}
            </button>
          </div>
        </section>
      )}

      <section className="content-card">
        <div className="toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Zoek op klantnummer, naam, plaats of e-mail..."
          />

          <select
            className={styles.filter}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
          >
            <option value="Actief">Actief</option>
            <option value="Gearchiveerd">
              Gearchiveerd
            </option>
            <option value="Alles">Alles</option>
          </select>
        </div>

        {loading ? (
          <div className={styles.empty}>
            Klanten laden...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className={styles.empty}>
            Geen klanten gevonden.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Klantnummer</th>
                  <th>Bedrijfsnaam</th>
                  <th>Contactpersoon</th>
                  <th>Plaats</th>
                  <th>Land</th>
                  <th>Status</th>
                  <th>Acties</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.customerNumber}</td>

                    <td>
                      <strong>{customer.companyName}</strong>
                      <div className={styles.meta}>
                        {customer.email || "Geen e-mail"}
                      </div>
                    </td>

                    <td>
                      {customer.contactPerson || "—"}
                    </td>

                    <td>{customer.city || "—"}</td>
                    <td>{customer.country}</td>

                    <td>
                      <StatusBadge
                        label={
                          customer.status === "Actief"
                            ? "Actief"
                            : "Gearchiveerd"
                        }
                        tone={
                          customer.status === "Actief"
                            ? "success"
                            : "neutral"
                        }
                      />
                    </td>

                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => startEdit(customer)}
                        >
                          Openen
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void toggleStatus(customer)
                          }
                        >
                          {customer.status === "Actief"
                            ? "Archiveren"
                            : "Activeren"}
                        </button>

                        <button
                          type="button"
                          className={styles.deleteAction}
                          onClick={() =>
                            void removeCustomer(customer)
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
        )}
      </section>
    </div>
  );
}