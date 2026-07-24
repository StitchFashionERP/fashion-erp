"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { createMasterId } from "@/lib/master-data";
import { getCustomers, saveCustomers, type Customer } from "@/lib/customers";
import { getPriceLists } from "@/lib/price-lists";
import { getCustomerHistoryCheck } from "@/lib/relation-history";
import { relationLanguages, type RelationLanguage } from "@/lib/language";
import { getSalesOrders } from "@/lib/sales";
import { getInvoices, type Invoice } from "@/lib/invoices";
import {
  commonCountries,
  isNetherlands,
  viesCheckUrl,
  type CustomerType,
  type VatNumberStatus,
} from "@/lib/vat-engine";
import styles from "./customers.module.css";

type StatusFilter = "Actief" | "Gearchiveerd" | "Alles";
type CustomerTab =
  | "Algemeen"
  | "Contactpersonen"
  | "Adressen"
  | "Financieel"
  | "Orders"
  | "Facturen"
  | "Documenten"
  | "Notities";

type ContactRole = "Algemeen" | "Inkoop" | "Verkoop" | "Financieel" | "Logistiek";
type AddressType = "Bezoekadres" | "Factuuradres" | "Afleveradres" | "Overig";
type DocumentType = "Contract" | "Prijslijst" | "Certificaat" | "Overig";

type CustomerContact = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  role: ContactRole;
  email: string;
  phone: string;
  mobile: string;
  isPrimary: boolean;
  isActive: boolean;
};

type CustomerAddress = {
  id: string;
  label: string;
  type: AddressType;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  isDefault: boolean;
  isActive: boolean;
};

type CustomerDocument = {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  description: string;
  createdAt: string;
};

type CustomerNote = {
  id: string;
  text: string;
  createdAt: string;
};

type CustomerCrm = {
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  creditLimit: number;
  currency: string;
  incoterm: string;
  debtorGroup: string;
  deliveryCondition: string;
  shippingMethod: string;
  documents: CustomerDocument[];
  notes: CustomerNote[];
  customerSince: string;
};

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

type ContactForm = Omit<CustomerContact, "id">;
type AddressForm = Omit<CustomerAddress, "id">;
type DocumentForm = Omit<CustomerDocument, "id" | "createdAt">;

type CustomerOrder = {
  id: string;
  customerId: string;
  orderNumber?: string;
  salesOrderNumber?: string;
  orderDate?: string;
  createdAt?: string;
  status?: string;
  total?: number;
  grandTotal?: number;
};

const tabs: CustomerTab[] = [
  "Algemeen",
  "Contactpersonen",
  "Adressen",
  "Financieel",
  "Orders",
  "Facturen",
  "Documenten",
  "Notities",
];
const contactRoles: ContactRole[] = ["Algemeen", "Inkoop", "Verkoop", "Financieel", "Logistiek"];
const addressTypes: AddressType[] = ["Bezoekadres", "Factuuradres", "Afleveradres", "Overig"];
const documentTypes: DocumentType[] = ["Contract", "Prijslijst", "Certificaat", "Overig"];
const CRM_STORAGE_KEY = "stitch-customer-crm-v1";

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

const emptyContact: ContactForm = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  department: "",
  role: "Algemeen",
  email: "",
  phone: "",
  mobile: "",
  isPrimary: false,
  isActive: true,
};

const emptyAddress: AddressForm = {
  label: "",
  type: "Afleveradres",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "Nederland",
  isDefault: false,
  isActive: true,
};

const emptyDocument: DocumentForm = {
  name: "",
  type: "Overig",
  url: "",
  description: "",
};

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function customerToForm(customer: Customer): CustomerForm {
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
    paymentDays: String(customer.paymentDays),
    paymentDiscountPercentage: String(customer.paymentDiscountPercentage),
    paymentDiscountDays: String(customer.paymentDiscountDays),
    discountPercentage: String(customer.discountPercentage),
    priceListId: customer.priceListId || "price-list-standard",
  };
}

function emptyCrm(customer?: Customer): CustomerCrm {
  const seededContact = customer && (customer.contactPerson || customer.email || customer.phone)
    ? [{
        id: createMasterId("contact", `${customer.id}-${customer.contactPerson}`),
        firstName: customer.contactPerson.split(" ")[0] || "",
        lastName: customer.contactPerson.split(" ").slice(1).join(" "),
        jobTitle: "",
        department: "",
        role: "Algemeen" as ContactRole,
        email: customer.email,
        phone: customer.phone,
        mobile: "",
        isPrimary: true,
        isActive: true,
      }]
    : [];
  const seededAddress = customer && (customer.city || customer.country)
    ? [{
        id: createMasterId("address", customer.id),
        label: "Hoofdadres",
        type: "Bezoekadres" as AddressType,
        street: "",
        houseNumber: "",
        postalCode: "",
        city: customer.city,
        country: customer.country,
        isDefault: true,
        isActive: true,
      }]
    : [];
  return {
    contacts: seededContact,
    addresses: seededAddress,
    creditLimit: 0,
    currency: "EUR",
    incoterm: "",
    debtorGroup: "Standaard",
    deliveryCondition: "",
    shippingMethod: "",
    documents: [],
    notes: [],
    customerSince: today(),
  };
}

function readCrmMap(): Record<string, CustomerCrm> {
  if (typeof window === "undefined") return {};
  try {
    const value = window.localStorage.getItem(CRM_STORAGE_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function writeCrmMap(map: Record<string, CustomerCrm>) {
  window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(map));
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Actief");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>("Algemeen");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [crm, setCrm] = useState<CustomerCrm>(emptyCrm());
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContact);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocument);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const priceLists = useMemo(() => getPriceLists().filter((item) => item.isActive), []);
  const editingCustomer = useMemo(() => editingId ? items.find((item) => item.id === editingId) || null : null, [editingId, items]);
  const customerOrders = useMemo(() => orders.filter((item) => item.customerId === editingId), [orders, editingId]);
  const customerInvoices = useMemo(() => invoices.filter((item) => item.customerId === editingId), [invoices, editingId]);
  const revenue = customerInvoices.filter((item) => !["Concept", "Gecrediteerd"].includes(item.status)).reduce((sum, item) => sum + item.total, 0);
  const outstanding = customerInvoices.filter((item) => !["Betaald", "Gecrediteerd"].includes(item.status)).reduce((sum, item) => sum + Math.max(0, item.total - item.payments.reduce((paid, payment) => paid + payment.amount, 0)), 0);

  useEffect(() => {
    setItems(getCustomers());
    setOrders(getSalesOrders() as unknown as CustomerOrder[]);
    setInvoices(getInvoices());
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const statusMatches = statusFilter === "Alles" || (statusFilter === "Actief" && item.status === "Actief") || (statusFilter === "Gearchiveerd" && item.status === "Inactief");
      return statusMatches && (!query || [item.customerNumber, item.companyName, item.contactPerson, item.email, item.city, item.country, item.chamberOfCommerceNumber, item.vatNumber].join(" ").toLowerCase().includes(query));
    });
  }, [items, search, statusFilter]);

  function commit(nextItems: Customer[]) {
    setItems(nextItems);
    saveCustomers(nextItems);
  }

  function updateForm(changes: Partial<CustomerForm>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function persistCrm(customerId: string, nextCrm: CustomerCrm) {
    const map = readCrmMap();
    map[customerId] = nextCrm;
    writeCrmMap(map);
    setCrm(nextCrm);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setCrm(emptyCrm());
    setShowForm(false);
    setActiveTab("Algemeen");
    setShowContactForm(false);
    setShowAddressForm(false);
    setShowDocumentForm(false);
    setMessage("");
    setError("");
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(customer: Customer) {
    const stored = readCrmMap()[customer.id];
    setEditingId(customer.id);
    setForm(customerToForm(customer));
    setCrm(stored || emptyCrm(customer));
    setShowForm(true);
    setActiveTab("Algemeen");
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validate() {
    if (!form.companyName.trim()) throw new Error("Vul een bedrijfsnaam in.");
    if (!isNetherlands(form.country) && !form.vatNumber.trim()) throw new Error("Bij een buitenlandse klant is het buitenlandse btw-nummer verplicht.");
  }

  function saveCustomer() {
    try {
      validate();
      const checkedAt = form.vatNumberStatus === "Geldig" ? today() : "";
      const primary = crm.contacts.find((contact) => contact.isPrimary) || crm.contacts[0];
      const contactPerson = primary ? [primary.firstName, primary.lastName].filter(Boolean).join(" ") : form.contactPerson.trim();
      const contactEmail = primary?.email || form.email.trim();
      const contactPhone = primary?.phone || primary?.mobile || form.phone.trim();
      const defaultAddress = crm.addresses.find((address) => address.isDefault) || crm.addresses[0];
      const customerId = editingId || createMasterId("customer", form.companyName);
      const nextCustomer: Customer = {
        id: customerId,
        customerNumber: editingCustomer?.customerNumber || `KLT-${String(items.length + 1).padStart(4, "0")}`,
        companyName: form.companyName.trim(),
        contactPerson,
        email: contactEmail,
        phone: contactPhone,
        city: defaultAddress?.city || form.city.trim(),
        country: defaultAddress?.country || form.country,
        chamberOfCommerceNumber: form.chamberOfCommerceNumber.trim().replace(/\s+/g, ""),
        customerType: form.customerType,
        vatNumber: form.vatNumber.trim().toUpperCase(),
        vatNumberStatus: form.vatNumberStatus,
        vatNumberCheckedAt: checkedAt,
        transactionNature: form.transactionNature,
        language: form.language,
        paymentDays: numberValue(form.paymentDays) || 30,
        paymentDiscountPercentage: numberValue(form.paymentDiscountPercentage),
        paymentDiscountDays: numberValue(form.paymentDiscountDays),
        discountPercentage: numberValue(form.discountPercentage),
        priceListId: form.priceListId,
        status: editingCustomer?.status || "Actief",
      };
      commit(editingId ? items.map((item) => item.id === editingId ? nextCustomer : item) : [...items, nextCustomer]);
      persistCrm(customerId, crm);
      setMessage(editingId ? "Klant bijgewerkt." : "Klant toegevoegd.");
      setEditingId(customerId);
      setShowForm(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Opslaan is niet gelukt.");
    }
  }

  function saveContact() {
    if (!contactForm.firstName.trim() && !contactForm.lastName.trim()) return setError("Vul minimaal een voornaam of achternaam in.");
    const id = editingContactId || createMasterId("contact", `${Date.now()}-${contactForm.email}`);
    let contacts = editingContactId ? crm.contacts.map((item) => item.id === id ? { id, ...contactForm } : item) : [...crm.contacts, { id, ...contactForm }];
    if (contactForm.isPrimary || contacts.length === 1) contacts = contacts.map((item) => ({ ...item, isPrimary: item.id === id }));
    setCrm({ ...crm, contacts });
    setContactForm(emptyContact);
    setEditingContactId(null);
    setShowContactForm(false);
  }

  function saveAddress() {
    if (!addressForm.city.trim()) return setError("Vul minimaal een plaats in.");
    const id = editingAddressId || createMasterId("address", `${Date.now()}-${addressForm.city}`);
    let addresses = editingAddressId ? crm.addresses.map((item) => item.id === id ? { id, ...addressForm } : item) : [...crm.addresses, { id, ...addressForm }];
    if (addressForm.isDefault || addresses.length === 1) addresses = addresses.map((item) => ({ ...item, isDefault: item.id === id }));
    setCrm({ ...crm, addresses });
    setAddressForm(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(false);
  }

  function saveDocument() {
    if (!documentForm.name.trim()) return setError("Vul een documentnaam in.");
    setCrm({ ...crm, documents: [{ id: createMasterId("document", `${Date.now()}-${documentForm.name}`), ...documentForm, createdAt: today() }, ...crm.documents] });
    setDocumentForm(emptyDocument);
    setShowDocumentForm(false);
  }

  function addNote() {
    if (!noteText.trim()) return;
    setCrm({ ...crm, notes: [{ id: createMasterId("note", `${Date.now()}`), text: noteText.trim(), createdAt: new Date().toISOString() }, ...crm.notes] });
    setNoteText("");
  }

  function archiveCustomer(customer: Customer) {
    commit(items.map((item) => item.id === customer.id ? { ...item, status: item.status === "Actief" ? "Inactief" : "Actief" } : item));
  }

  function deleteCustomer(customer: Customer) {
    const history = getCustomerHistoryCheck(customer.id);
    if (!history.canDelete) return setError(history.message);
    if (!window.confirm(`Klant ${customer.companyName} definitief verwijderen?`)) return;
    commit(items.filter((item) => item.id !== customer.id));
  }

  return (
    <div>
      <PageHeader eyebrow="Relaties" title="Klanten" description="Beheer klanten, contactpersonen, adressen en financiële afspraken." action={<button type="button" className="button button-primary" onClick={startCreate}>+ Nieuwe klant</button>} />

      {message && <div className={styles.success}>✓ {message}</div>}
      {error && <div className={styles.error}>! {error}</div>}

      {showForm && (
        <section className={`content-card ${styles.customerCard}`}>
          <div className={styles.customerHeader}>
            <div>
              <div className={styles.customerEyebrow}>{editingCustomer?.customerNumber || "Nieuwe relatie"}</div>
              <h2>{form.companyName || "Nieuwe klant"}</h2>
              <p>{editingCustomer ? `${editingCustomer.country} · ${editingCustomer.customerType}` : "Maak een nieuwe klantrelatie aan."}</p>
            </div>
            <div className={styles.headerActions}>
              {editingCustomer && <StatusBadge label={editingCustomer.status === "Actief" ? "Actief" : "Gearchiveerd"} tone={editingCustomer.status === "Actief" ? "success" : "neutral"} />}
              <button type="button" className="button button-secondary" onClick={resetForm}>Sluiten</button>
            </div>
          </div>

          {editingId && (
            <div className={styles.kpiGrid}>
              <div><span>Omzet</span><strong>{money(revenue)}</strong></div>
              <div><span>Openstaand</span><strong>{money(outstanding)}</strong></div>
              <div><span>Orders</span><strong>{customerOrders.length}</strong></div>
              <div><span>Facturen</span><strong>{customerInvoices.length}</strong></div>
              <div><span>Klant sinds</span><strong>{crm.customerSince || "—"}</strong></div>
            </div>
          )}

          <div className={styles.tabs}>{tabs.map((tab) => <button key={tab} type="button" className={activeTab === tab ? styles.activeTab : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>

          <div className={styles.tabContent}>
            {activeTab === "Algemeen" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}><div><h3>Relatiegegevens</h3><p>Basisgegevens en fiscale instellingen.</p></div></div>
                <div className={styles.formGrid}>
                  <label><span>Bedrijfsnaam</span><input value={form.companyName} onChange={(e) => updateForm({ companyName: e.target.value })} /></label>
                  <label><span>Type klant</span><select value={form.customerType} onChange={(e) => updateForm({ customerType: e.target.value as CustomerType })}><option>Zakelijk</option><option>Particulier</option></select></label>
                  <label><span>Taal</span><select value={form.language} onChange={(e) => updateForm({ language: e.target.value as RelationLanguage })}>{relationLanguages.map((language) => <option key={language}>{language}</option>)}</select></label>
                  <label><span>Land</span><select value={form.country} onChange={(e) => updateForm({ country: e.target.value, vatNumberStatus: "Niet gecontroleerd" })}>{commonCountries.map((country) => <option key={country}>{country}</option>)}</select></label>
                  {isNetherlands(form.country) && <label><span>KvK-nummer</span><input value={form.chamberOfCommerceNumber} onChange={(e) => updateForm({ chamberOfCommerceNumber: e.target.value })} /></label>}
                  {!isNetherlands(form.country) && <><label><span>Buitenlands btw-nummer</span><input value={form.vatNumber} onChange={(e) => updateForm({ vatNumber: e.target.value, vatNumberStatus: "Niet gecontroleerd" })} /></label><label><span>Controle-status</span><select value={form.vatNumberStatus} onChange={(e) => updateForm({ vatNumberStatus: e.target.value as VatNumberStatus })}><option>Niet gecontroleerd</option><option>Geldig</option><option>Ongeldig</option></select></label><label><span>Transactietype</span><select value={form.transactionNature} onChange={(e) => updateForm({ transactionNature: e.target.value as "Goederen" | "Diensten" })}><option>Goederen</option><option>Diensten</option></select></label><a className="button button-secondary" href={viesCheckUrl} target="_blank" rel="noreferrer">Controleer via VIES ↗</a></>}
                </div>
              </div>
            )}

            {activeTab === "Contactpersonen" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}><div><h3>Contactpersonen</h3><p>Meerdere contactpersonen per afdeling.</p></div><button type="button" className="button button-primary" onClick={() => { setContactForm({ ...emptyContact, isPrimary: crm.contacts.length === 0 }); setEditingContactId(null); setShowContactForm(true); }}>+ Contactpersoon</button></div>
                {showContactForm && <div className={styles.editor}><div className={styles.formGrid}>
                  <label><span>Voornaam</span><input value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} /></label>
                  <label><span>Achternaam</span><input value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} /></label>
                  <label><span>Functie</span><input value={contactForm.jobTitle} onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })} /></label>
                  <label><span>Afdeling</span><input value={contactForm.department} onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })} /></label>
                  <label><span>Type</span><select value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value as ContactRole })}>{contactRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
                  <label><span>E-mail</span><input value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></label>
                  <label><span>Telefoon</span><input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></label>
                  <label><span>Mobiel</span><input value={contactForm.mobile} onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })} /></label>
                </div><div className={styles.checks}><label><input type="checkbox" checked={contactForm.isPrimary} onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })} /> Standaard</label><label><input type="checkbox" checked={contactForm.isActive} onChange={(e) => setContactForm({ ...contactForm, isActive: e.target.checked })} /> Actief</label></div><div className={styles.editorActions}><button className="button button-secondary" onClick={() => setShowContactForm(false)}>Annuleren</button><button className="button button-primary" onClick={saveContact}>Opslaan</button></div></div>}
                <div className={styles.cards}>{crm.contacts.map((contact) => <article key={contact.id} className={styles.itemCard}><div><strong>{[contact.firstName, contact.lastName].filter(Boolean).join(" ")}</strong><p>{[contact.jobTitle, contact.department, contact.role].filter(Boolean).join(" · ")}</p><small>{contact.email || "—"} · {contact.mobile || contact.phone || "—"}</small></div><div className={styles.itemActions}>{contact.isPrimary && <span className={styles.primaryPill}>Standaard</span>}<button onClick={() => { const { id, ...rest } = contact; setContactForm(rest); setEditingContactId(id); setShowContactForm(true); }}>Bewerken</button><button className={styles.deleteAction} onClick={() => setCrm({ ...crm, contacts: crm.contacts.filter((item) => item.id !== contact.id) })}>Verwijderen</button></div></article>)}</div>
              </div>
            )}

            {activeTab === "Adressen" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}><div><h3>Adressen</h3><p>Bezoek-, factuur- en afleveradressen.</p></div><button type="button" className="button button-primary" onClick={() => { setAddressForm({ ...emptyAddress, isDefault: crm.addresses.length === 0 }); setEditingAddressId(null); setShowAddressForm(true); }}>+ Adres</button></div>
                {showAddressForm && <div className={styles.editor}><div className={styles.formGrid}>
                  <label><span>Naam / label</span><input value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} /></label>
                  <label><span>Type</span><select value={addressForm.type} onChange={(e) => setAddressForm({ ...addressForm, type: e.target.value as AddressType })}>{addressTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <label><span>Straat</span><input value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} /></label>
                  <label><span>Huisnummer</span><input value={addressForm.houseNumber} onChange={(e) => setAddressForm({ ...addressForm, houseNumber: e.target.value })} /></label>
                  <label><span>Postcode</span><input value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })} /></label>
                  <label><span>Plaats</span><input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /></label>
                  <label><span>Land</span><select value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}>{commonCountries.map((country) => <option key={country}>{country}</option>)}</select></label>
                </div><div className={styles.checks}><label><input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /> Standaardadres</label><label><input type="checkbox" checked={addressForm.isActive} onChange={(e) => setAddressForm({ ...addressForm, isActive: e.target.checked })} /> Actief</label></div><div className={styles.editorActions}><button className="button button-secondary" onClick={() => setShowAddressForm(false)}>Annuleren</button><button className="button button-primary" onClick={saveAddress}>Opslaan</button></div></div>}
                <div className={styles.cards}>{crm.addresses.map((address) => <article key={address.id} className={styles.itemCard}><div><strong>{address.label || address.type}</strong><p>{address.street} {address.houseNumber}</p><small>{address.postalCode} {address.city} · {address.country}</small></div><div className={styles.itemActions}>{address.isDefault && <span className={styles.primaryPill}>Standaard</span>}<button onClick={() => { const { id, ...rest } = address; setAddressForm(rest); setEditingAddressId(id); setShowAddressForm(true); }}>Bewerken</button><button className={styles.deleteAction} onClick={() => setCrm({ ...crm, addresses: crm.addresses.filter((item) => item.id !== address.id) })}>Verwijderen</button></div></article>)}</div>
              </div>
            )}

            {activeTab === "Financieel" && <div className={styles.section}><div className={styles.sectionTitle}><div><h3>Financiële instellingen</h3><p>Betaal-, prijs- en leveringsafspraken.</p></div></div><div className={styles.formGrid}>
              <label><span>Betaaltermijn</span><input type="number" value={form.paymentDays} onChange={(e) => updateForm({ paymentDays: e.target.value })} /></label>
              <label><span>Prijslijst</span><select value={form.priceListId} onChange={(e) => updateForm({ priceListId: e.target.value })}>{priceLists.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label><span>Standaardkorting (%)</span><input value={form.discountPercentage} onChange={(e) => updateForm({ discountPercentage: e.target.value })} /></label>
              <label><span>Betalingskorting (%)</span><input value={form.paymentDiscountPercentage} onChange={(e) => updateForm({ paymentDiscountPercentage: e.target.value })} /></label>
              <label><span>Betalingskorting dagen</span><input type="number" value={form.paymentDiscountDays} onChange={(e) => updateForm({ paymentDiscountDays: e.target.value })} /></label>
              <label><span>Kredietlimiet</span><input type="number" value={crm.creditLimit} onChange={(e) => setCrm({ ...crm, creditLimit: Number(e.target.value) })} /></label>
              <label><span>Valuta</span><select value={crm.currency} onChange={(e) => setCrm({ ...crm, currency: e.target.value })}><option>EUR</option><option>GBP</option><option>USD</option><option>CHF</option></select></label>
              <label><span>Incoterm</span><input value={crm.incoterm} onChange={(e) => setCrm({ ...crm, incoterm: e.target.value })} /></label>
              <label><span>Debiteurengroep</span><input value={crm.debtorGroup} onChange={(e) => setCrm({ ...crm, debtorGroup: e.target.value })} /></label>
              <label><span>Leverconditie</span><input value={crm.deliveryCondition} onChange={(e) => setCrm({ ...crm, deliveryCondition: e.target.value })} /></label>
              <label><span>Verzendmethode</span><input value={crm.shippingMethod} onChange={(e) => setCrm({ ...crm, shippingMethod: e.target.value })} /></label>
            </div></div>}

            {activeTab === "Orders" && <div className={styles.section}><div className={styles.sectionTitle}><div><h3>Verkooporders</h3><p>Alle verkooporders van deze klant.</p></div></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>Order</th><th>Datum</th><th>Status</th><th className="table-number">Totaal</th></tr></thead><tbody>{customerOrders.map((order) => <tr key={order.id}><td><Link href={`/verkooporders/${order.id}`}>{order.orderNumber || order.salesOrderNumber || order.id}</Link></td><td>{order.orderDate || order.createdAt?.slice(0, 10) || "—"}</td><td>{order.status || "—"}</td><td className="table-number">{money(order.total || order.grandTotal || 0)}</td></tr>)}</tbody></table></div>{customerOrders.length === 0 && <div className={styles.empty}>Geen verkooporders gevonden.</div>}</div>}

            {activeTab === "Facturen" && <div className={styles.section}><div className={styles.sectionTitle}><div><h3>Facturen</h3><p>Factuurhistorie en openstaande posten.</p></div></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>Factuur</th><th>Datum</th><th>Vervaldatum</th><th>Status</th><th className="table-number">Totaal</th></tr></thead><tbody>{customerInvoices.map((invoice) => <tr key={invoice.id}><td><Link href={`/facturen/${invoice.id}`}>{invoice.invoiceNumber}</Link></td><td>{invoice.invoiceDate}</td><td>{invoice.dueDate}</td><td>{invoice.status}</td><td className="table-number">{money(invoice.total)}</td></tr>)}</tbody></table></div>{customerInvoices.length === 0 && <div className={styles.empty}>Geen facturen gevonden.</div>}</div>}

            {activeTab === "Documenten" && <div className={styles.section}><div className={styles.sectionTitle}><div><h3>Documenten</h3><p>Contracten, prijslijsten en certificaten.</p></div><button className="button button-primary" onClick={() => setShowDocumentForm(true)}>+ Document</button></div>{showDocumentForm && <div className={styles.editor}><div className={styles.formGrid}><label><span>Naam</span><input value={documentForm.name} onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })} /></label><label><span>Type</span><select value={documentForm.type} onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value as DocumentType })}>{documentTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>Link / pad</span><input value={documentForm.url} onChange={(e) => setDocumentForm({ ...documentForm, url: e.target.value })} /></label><label className={styles.fullWidth}><span>Omschrijving</span><input value={documentForm.description} onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })} /></label></div><div className={styles.editorActions}><button className="button button-secondary" onClick={() => setShowDocumentForm(false)}>Annuleren</button><button className="button button-primary" onClick={saveDocument}>Opslaan</button></div></div>}<div className={styles.cards}>{crm.documents.map((document) => <article key={document.id} className={styles.itemCard}><div><strong>{document.name}</strong><p>{document.type} · {document.createdAt}</p><small>{document.description || "Geen omschrijving"}</small></div><div className={styles.itemActions}>{document.url && <a href={document.url} target="_blank" rel="noreferrer">Openen</a>}<button className={styles.deleteAction} onClick={() => setCrm({ ...crm, documents: crm.documents.filter((item) => item.id !== document.id) })}>Verwijderen</button></div></article>)}</div></div>}

            {activeTab === "Notities" && <div className={styles.section}><div className={styles.sectionTitle}><div><h3>Notities en activiteiten</h3><p>Interne klantnotities in chronologische volgorde.</p></div></div><div className={styles.noteComposer}><textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Schrijf een interne notitie..." /><button className="button button-primary" onClick={addNote}>Notitie toevoegen</button></div><div className={styles.timeline}>{crm.notes.map((note) => <article key={note.id}><time>{new Date(note.createdAt).toLocaleString("nl-NL")}</time><p>{note.text}</p><button onClick={() => setCrm({ ...crm, notes: crm.notes.filter((item) => item.id !== note.id) })}>Verwijderen</button></article>)}</div>{crm.notes.length === 0 && <div className={styles.empty}>Nog geen notities.</div>}</div>}
          </div>

          <div className={styles.formActions}><button type="button" className="button button-secondary" onClick={resetForm}>Annuleren</button><button type="button" className="button button-primary" onClick={saveCustomer}>{editingId ? "Wijzigingen opslaan" : "Klant opslaan"}</button></div>
        </section>
      )}

      <section className="content-card">
        <div className="content-card-toolbar"><div className="table-search"><span>⌕</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek klant, land of btw-nummer..." /></div><select className={styles.filter} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}><option>Actief</option><option>Gearchiveerd</option><option>Alles</option></select></div>
        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Nummer</th><th>Klant</th><th>Land</th><th>KvK / BTW</th><th>Taal</th><th>Betaaltermijn</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.customerNumber}</td><td className="table-primary">{item.companyName}<div className={styles.meta}>{item.contactPerson || "—"}</div></td><td>{item.country}</td><td>{isNetherlands(item.country) ? item.chamberOfCommerceNumber || "—" : item.vatNumber || "—"}</td><td>{item.language}</td><td>{item.paymentDays} dagen</td><td><StatusBadge label={item.status === "Actief" ? "Actief" : "Gearchiveerd"} tone={item.status === "Actief" ? "success" : "neutral"} /></td><td className="table-number"><div className={styles.rowActions}><button onClick={() => startEdit(item)}>Bewerken</button><button onClick={() => archiveCustomer(item)}>{item.status === "Actief" ? "Archiveren" : "Activeren"}</button><button className={styles.deleteAction} onClick={() => deleteCustomer(item)}>Verwijderen</button></div></td></tr>)}</tbody></table></div>
        {filtered.length === 0 && <div className={styles.empty}>Geen klanten gevonden.</div>}
      </section>
    </div>
  );
}
