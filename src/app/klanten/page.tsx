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
  CustomerAddressesTab,
  CustomerContactsTab,
  CustomerFinancialTab,
  CustomerGeneralTab,
  CustomerNotesTab,
  CustomerOrdersTab,
  type CustomerContact,
  type CustomerGeneralForm,
} from "./components/CustomerTabs";
import styles from "./customers.module.css";

type StatusFilter = "Actief" | "Gearchiveerd" | "Alles";
type CustomerTab = "Algemeen" | "Contactpersonen" | "Adressen" | "Financieel" | "Orders" | "Notities";
const customerTabs: CustomerTab[] = ["Algemeen", "Contactpersonen", "Adressen", "Financieel", "Orders", "Notities"];

type CustomerCrmData = {
  street?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postalCode?: string;

  invoiceStreet?: string;
  invoiceHouseNumber?: string;
  invoiceHouseNumberAddition?: string;
  invoicePostalCode?: string;
  invoiceCity?: string;
  invoiceCountry?: string;

  useDifferentDeliveryAddress?: boolean;
  deliveryStreet?: string;
  deliveryHouseNumber?: string;
  deliveryHouseNumberAddition?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;

  contacts?: CustomerContact[];

  pricingPolicy?: "company" | "custom";
  retailerMarkup?: number;
  invoiceEmail?: string;
  invoiceCc?: string;
  orderEmail?: string;
  orderCc?: string;
  deliveryEmail?: string;
  deliveryCc?: string;
};

const emptyForm: CustomerGeneralForm = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",

  street: "",
  houseNumber: "",
  houseNumberAddition: "",
  postalCode: "",
  city: "",
  country: "Nederland",

  invoiceStreet: "",
  invoiceHouseNumber: "",
  invoiceHouseNumberAddition: "",
  invoicePostalCode: "",
  invoiceCity: "",
  invoiceCountry: "Nederland",

  useDifferentDeliveryAddress: false,
  deliveryStreet: "",
  deliveryHouseNumber: "",
  deliveryHouseNumberAddition: "",
  deliveryPostalCode: "",
  deliveryCity: "",
  deliveryCountry: "Nederland",

  contacts: [],

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
  pricingPolicy: "company",
  retailerMarkup: "",
  invoiceEmail: "",
  invoiceCc: "",
  orderEmail: "",
  orderCc: "",
  deliveryEmail: "",
  deliveryCc: "",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asContacts(value: unknown): CustomerContact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((contact): contact is CustomerContact => {
    if (!contact || typeof contact !== "object") {
      return false;
    }

    const candidate = contact as Partial<CustomerContact>;

    return (
      typeof candidate.id === "string" &&
      typeof candidate.firstName === "string" &&
      typeof candidate.lastName === "string" &&
      typeof candidate.jobTitle === "string" &&
      typeof candidate.email === "string" &&
      typeof candidate.phone === "string" &&
      typeof candidate.isPrimary === "boolean"
    );
  });
}

function customerToForm(customer: Customer): CustomerGeneralForm {
  const crm = asRecord(customer.crm);

  return {
    companyName: customer.companyName,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,

    street: asString(crm.street),
    houseNumber: asString(crm.houseNumber),
    houseNumberAddition: asString(crm.houseNumberAddition),
    postalCode: asString(crm.postalCode),
    city: customer.city,
    country: customer.country,

    invoiceStreet: asString(crm.invoiceStreet),
    invoiceHouseNumber: asString(crm.invoiceHouseNumber),
    invoiceHouseNumberAddition: asString(
      crm.invoiceHouseNumberAddition,
    ),
    invoicePostalCode: asString(crm.invoicePostalCode),
    invoiceCity: asString(crm.invoiceCity),
    invoiceCountry: asString(
      crm.invoiceCountry,
      customer.country,
    ),

    useDifferentDeliveryAddress: asBoolean(
      crm.useDifferentDeliveryAddress,
    ),
    deliveryStreet: asString(crm.deliveryStreet),
    deliveryHouseNumber: asString(crm.deliveryHouseNumber),
    deliveryHouseNumberAddition: asString(
      crm.deliveryHouseNumberAddition,
    ),
    deliveryPostalCode: asString(crm.deliveryPostalCode),
    deliveryCity: asString(crm.deliveryCity),
    deliveryCountry: asString(
      crm.deliveryCountry,
      customer.country,
    ),

    contacts: asContacts(crm.contacts),

    chamberOfCommerceNumber:
      customer.chamberOfCommerceNumber || "",
    customerType: customer.customerType,
    vatNumber: customer.vatNumber,
    vatNumberStatus: customer.vatNumberStatus,
    transactionNature: customer.transactionNature,
    language: customer.language,

    paymentDays: String(customer.paymentDays ?? 30),
    paymentDiscountPercentage: String(
      customer.paymentDiscountPercentage ?? 0,
    ),
    paymentDiscountDays: String(
      customer.paymentDiscountDays ?? 0,
    ),
    discountPercentage: String(
      customer.discountPercentage ?? 0,
    ),
    priceListId:
      customer.priceListId || "price-list-standard",
    pricingPolicy:
      crm.pricingPolicy === "custom" ? "custom" : "company",
    retailerMarkup:
      typeof crm.retailerMarkup === "number"
        ? String(crm.retailerMarkup).replace(".", ",")
        : "",
    invoiceEmail: asString(crm.invoiceEmail),
    invoiceCc: asString(crm.invoiceCc),
    orderEmail: asString(crm.orderEmail),
    orderCc: asString(crm.orderCc),
    deliveryEmail: asString(crm.deliveryEmail),
    deliveryCc: asString(crm.deliveryCc),
  };
}

function formToCrm(form: CustomerGeneralForm): CustomerCrmData {
  return {
    street: form.street?.trim() || "",
    houseNumber: form.houseNumber?.trim() || "",
    houseNumberAddition:
      form.houseNumberAddition?.trim() || "",
    postalCode: form.postalCode?.trim().toUpperCase() || "",

    invoiceStreet: form.invoiceStreet?.trim() || "",
    invoiceHouseNumber:
      form.invoiceHouseNumber?.trim() || "",
    invoiceHouseNumberAddition:
      form.invoiceHouseNumberAddition?.trim() || "",
    invoicePostalCode:
      form.invoicePostalCode?.trim().toUpperCase() || "",
    invoiceCity: form.invoiceCity?.trim() || "",
    invoiceCountry:
      form.invoiceCountry?.trim() || form.country,

    useDifferentDeliveryAddress:
      form.useDifferentDeliveryAddress ?? false,
    deliveryStreet: form.deliveryStreet?.trim() || "",
    deliveryHouseNumber:
      form.deliveryHouseNumber?.trim() || "",
    deliveryHouseNumberAddition:
      form.deliveryHouseNumberAddition?.trim() || "",
    deliveryPostalCode:
      form.deliveryPostalCode?.trim().toUpperCase() || "",
    deliveryCity: form.deliveryCity?.trim() || "",
    deliveryCountry:
      form.deliveryCountry?.trim() || form.country,

    contacts: form.contacts ?? [],

    pricingPolicy:
      form.pricingPolicy === "custom" ? "custom" : "company",
    retailerMarkup:
      form.pricingPolicy === "custom"
        ? parseNumber(form.retailerMarkup, 0)
        : undefined,
    invoiceEmail: form.invoiceEmail?.trim() || "",
    invoiceCc: form.invoiceCc?.trim() || "",
    orderEmail: form.orderEmail?.trim() || "",
    orderCc: form.orderCc?.trim() || "",
    deliveryEmail: form.deliveryEmail?.trim() || "",
    deliveryCc: form.deliveryCc?.trim() || "",
  };
}

function parseNumber(value: string | undefined, fallback = 0) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : fallback;
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
  const [form, setForm] =
    useState<CustomerGeneralForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>("Algemeen");
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
        ? customers.find(
            (customer) => customer.id === editingId,
          ) || null
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

        const crm = asRecord(customer.crm);

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
          asString(crm.street),
          asString(crm.houseNumber),
          asString(crm.postalCode),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) =>
        a.companyName.localeCompare(b.companyName, "nl"),
      );
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

  function updateForm(
    changes: Partial<CustomerGeneralForm>,
  ) {
    setForm((current) => ({
      ...current,
      ...changes,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setActiveTab("Algemeen");
    setError("");
  }

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setActiveTab("Algemeen");
    setMessage("");
    setError("");
  }

  function startEdit(customer: Customer) {
    setForm(customerToForm(customer));
    setEditingId(customer.id);
    setShowForm(true);
    setActiveTab("Algemeen");
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

    if (parseNumber(form.paymentDays, -1) < 0) {
      throw new Error(
        "De betaaltermijn mag niet negatief zijn.",
      );
    }

    if (parseNumber(form.discountPercentage, -1) < 0) {
      throw new Error(
        "De standaardkorting mag niet negatief zijn.",
      );
    }

    if (
      parseNumber(form.paymentDiscountPercentage, -1) < 0
    ) {
      throw new Error(
        "De betalingskorting mag niet negatief zijn.",
      );
    }

    if (parseNumber(form.paymentDiscountDays, -1) < 0) {
      throw new Error(
        "Het aantal dagen voor betalingskorting mag niet negatief zijn.",
      );
    }

    if (
      form.pricingPolicy === "custom" &&
      parseNumber(form.retailerMarkup, 0) <= 0
    ) {
      throw new Error(
        "Vul bij een eigen retailmarkup een waarde groter dan 0 in.",
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

      const crm = formToCrm(form);

      const nextCustomer: Customer = {
        id: customerId,
        customerNumber:
          editingCustomer?.customerNumber ||
          createCustomerNumber(customers),
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),

        invoiceEmail: form.invoiceEmail.trim(),
        invoiceCc: form.invoiceCc.trim(),
        orderEmail: form.orderEmail.trim(),
        orderCc: form.orderCc.trim(),
        deliveryEmail: form.deliveryEmail.trim(),
        deliveryCc: form.deliveryCc.trim(),

        phone: form.phone.trim(),
        city: form.city.trim(),
        country: form.country,
        chamberOfCommerceNumber:
          form.chamberOfCommerceNumber.trim(),
        customerType: form.customerType,
        vatNumber: form.vatNumber.trim().toUpperCase(),
        vatNumberStatus: form.vatNumberStatus,
        vatNumberCheckedAt:
          form.vatNumberStatus === "Geldig"
            ? editingCustomer?.vatNumberStatus === "Geldig" &&
              editingCustomer.vatNumberCheckedAt
              ? editingCustomer.vatNumberCheckedAt
              : new Date().toISOString()
            : "",
        transactionNature: form.transactionNature,
        language: form.language,
        paymentDays: parseNumber(form.paymentDays, 30),
        paymentDiscountPercentage: parseNumber(
          form.paymentDiscountPercentage,
          0,
        ),
        paymentDiscountDays: parseNumber(
          form.paymentDiscountDays,
          0,
        ),
        discountPercentage: parseNumber(
          form.discountPercentage,
          0,
        ),
        priceListId:
          form.priceListId || "price-list-standard",
        status: editingCustomer?.status || "Actief",
        crm,
      };

      const savedCustomer = await saveCustomerCloud(
        nextCustomer,
        crm,
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

      const crm = asRecord(customer.crm);

      const savedCustomer = await saveCustomerCloud(
        nextCustomer,
        crm,
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
        description="Beheer klanten, adressen, contactpersonen en financiële instellingen."
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

              <h2>{form.companyName || "Nieuwe klant"}</h2>

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

          <div className={styles.tabs}>
            {customerTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? styles.activeTab : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            {activeTab === "Algemeen" && <CustomerGeneralTab form={form} updateForm={updateForm} />}
            {activeTab === "Contactpersonen" && <CustomerContactsTab form={form} updateForm={updateForm} />}
            {activeTab === "Adressen" && <CustomerAddressesTab form={form} updateForm={updateForm} />}
            {activeTab === "Financieel" && <CustomerFinancialTab form={form} updateForm={updateForm} />}
            {activeTab === "Orders" && <CustomerOrdersTab />}
            {activeTab === "Notities" && <CustomerNotesTab />}
          </div>

          <div className={styles.formActions}>
            <div className={styles.formDangerActions}>
              {editingCustomer && (
                <>
                  <button type="button" className="button button-secondary" onClick={() => void toggleStatus(editingCustomer)}>
                    {editingCustomer.status === "Actief" ? "Archiveren" : "Activeren"}
                  </button>
                  <button type="button" className="button button-danger" onClick={() => void removeCustomer(editingCustomer)}>Verwijderen</button>
                </>
              )}
            </div>
            <div className={styles.formSaveActions}>
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
            placeholder="Zoek op klantnummer, naam, adres, plaats of e-mail..."
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
                  <th>Adres</th>
                  <th>Plaats</th>
                  <th>Betaaltermijn</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => {
                  const crm = asRecord(customer.crm);
                  const street = asString(crm.street);
                  const houseNumber = asString(
                    crm.houseNumber,
                  );
                  const addition = asString(
                    crm.houseNumberAddition,
                  );
                  const postalCode = asString(
                    crm.postalCode,
                  );

                  const address = [
                    street,
                    [houseNumber, addition]
                      .filter(Boolean)
                      .join(""),
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={customer.id}>
                      <td><button type="button" className={styles.tableLink} onClick={() => startEdit(customer)}>{customer.customerNumber}</button></td>

                      <td>
                        <button type="button" className={`${styles.tableLink} ${styles.companyLink}`} onClick={() => startEdit(customer)}>{customer.companyName}</button>

                        <div className={styles.meta}>
                          {customer.email || "Geen e-mail"}
                        </div>
                      </td>

                      <td>
                        {customer.contactPerson || "—"}

                        {customer.phone && (
                          <div className={styles.meta}>
                            {customer.phone}
                          </div>
                        )}
                      </td>

                      <td>
                        {address || "—"}

                        {postalCode && (
                          <div className={styles.meta}>
                            {postalCode}
                          </div>
                        )}
                      </td>

                      <td>
                        {customer.city || "—"}

                        <div className={styles.meta}>
                          {customer.country}
                        </div>
                      </td>

                      <td>
                        {customer.paymentDays} dagen
                      </td>

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


                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}