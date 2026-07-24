"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { createMasterId } from "@/lib/master-data";
import {
  getSuppliers,
  saveSuppliers,
  type Supplier,
  type SupplierContact,
  type SupplierEmail,
  type SupplierEmailPurpose,
} from "@/lib/suppliers";
import { getSupplierHistoryCheck } from "@/lib/relation-history";
import { relationLanguages, type RelationLanguage } from "@/lib/language";
import {
  commonCountries,
  isNetherlands,
  viesCheckUrl,
  type CustomerType,
  type VatNumberStatus,
} from "@/lib/vat-engine";
import styles from "./suppliers.module.css";

type StatusFilter = "Actief" | "Inactief" | "Alles";

type SupplierForm = Omit<
  Supplier,
  | "id"
  | "supplierNumber"
  | "paymentDays"
  | "leadTimeDays"
  | "minimumOrderQuantity"
  | "minimumOrderValue"
  | "status"
> & {
  supplierNumber: string;
  paymentDays: string;
  leadTimeDays: string;
  minimumOrderQuantity: string;
  minimumOrderValue: string;
};

const newEmail = (): SupplierEmail => ({
  id: `supplier-email-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  email: "",
  purpose: "Bestellingen",
  receivesPurchaseOrders: true,
  defaultCc: false,
  active: true,
});

const newContact = (): SupplierContact => ({
  id: `supplier-contact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  firstName: "",
  lastName: "",
  jobTitle: "",
  phone: "",
  mobile: "",
  email: "",
  active: true,
});

const createEmptyForm = (): SupplierForm => ({
  supplierNumber: "",
  companyName: "",
  tradeName: "",
  website: "",
  chamberOfCommerceNumber: "",
  vatNumber: "",
  vatNumberStatus: "Niet gecontroleerd",
  vatNumberCheckedAt: "",
  eoriNumber: "",
  language: "Nederlands",
  currency: "EUR",
  customerType: "Zakelijk",
  transactionNature: "Goederen",
  street: "",
  houseNumber: "",
  houseNumberAddition: "",
  postalCode: "",
  city: "",
  province: "",
  country: "Nederland",
  paymentDays: "30",
  iban: "",
  bic: "",
  incoterm: "",
  leadTimeDays: "",
  minimumOrderQuantity: "",
  minimumOrderValue: "",
  warehouse: "",
  purchaseConditions: "",
  notes: "",
  contactPerson: "",
  email: "",
  phone: "",
  contacts: [newContact()],
  emails: [newEmail()],
});

function supplierToForm(supplier: Supplier): SupplierForm {
  return {
    ...supplier,
    supplierNumber: supplier.supplierNumber,
    paymentDays: String(supplier.paymentDays),
    leadTimeDays: supplier.leadTimeDays ? String(supplier.leadTimeDays) : "",
    minimumOrderQuantity: supplier.minimumOrderQuantity
      ? String(supplier.minimumOrderQuantity)
      : "",
    minimumOrderValue: supplier.minimumOrderValue
      ? String(supplier.minimumOrderValue)
      : "",
    contacts:
      supplier.contacts.length > 0
        ? supplier.contacts.map((item) => ({ ...item }))
        : [newContact()],
    emails:
      supplier.emails.length > 0
        ? supplier.emails.map((item) => ({ ...item }))
        : [newEmail()],
  };
}

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Actief");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SupplierForm>(createEmptyForm());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setItems(getSuppliers()), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const statusMatches =
        statusFilter === "Alles" || item.status === statusFilter;

      if (!statusMatches) return false;

      const haystack = [
        item.supplierNumber,
        item.companyName,
        item.tradeName,
        item.contactPerson,
        item.email,
        item.country,
        item.city,
        item.vatNumber,
        item.chamberOfCommerceNumber,
        item.eoriNumber,
        ...item.contacts.flatMap((contact) => [
          contact.firstName,
          contact.lastName,
          contact.jobTitle,
          contact.email,
          contact.phone,
          contact.mobile,
        ]),
        ...item.emails.map((email) => email.email),
      ]
        .join(" ")
        .toLowerCase();

      return !query || haystack.includes(query);
    });
  }, [items, search, statusFilter]);

  function commit(nextItems: Supplier[]) {
    setItems(nextItems);
    saveSuppliers(nextItems);
  }

  function updateForm(changes: Partial<SupplierForm>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm());
    setShowForm(false);
    setError("");
  }

  function startCreate() {
    setEditingId(null);
    setForm(createEmptyForm());
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addEmailAddress() {
    updateForm({ emails: [...form.emails, newEmail()] });
  }

  function updateEmailAddress(id: string, changes: Partial<SupplierEmail>) {
    updateForm({
      emails: form.emails.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    });
  }

  function removeEmailAddress(id: string) {
    updateForm({
      emails:
        form.emails.length === 1
          ? [newEmail()]
          : form.emails.filter((item) => item.id !== id),
    });
  }

  function addContact() {
    updateForm({ contacts: [...form.contacts, newContact()] });
  }

  function updateContact(id: string, changes: Partial<SupplierContact>) {
    updateForm({
      contacts: form.contacts.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    });
  }

  function removeContact(id: string) {
    updateForm({
      contacts:
        form.contacts.length === 1
          ? [newContact()]
          : form.contacts.filter((item) => item.id !== id),
    });
  }

  function validate() {
    if (!form.companyName.trim()) throw new Error("Vul een bedrijfsnaam in.");

    const invalidEmail = [...form.emails.map((item) => item.email), ...form.contacts.map((item) => item.email)]
      .find((email) => email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

    if (invalidEmail) throw new Error(`Controleer het e-mailadres: ${invalidEmail}`);

    if (!isNetherlands(form.country) && !form.vatNumber.trim()) {
      throw new Error(
        "Bij een buitenlandse leverancier is het buitenlandse btw-nummer verplicht.",
      );
    }
  }

  function saveSupplier() {
    try {
      validate();

      const contacts = form.contacts
        .map((item) => ({
          ...item,
          firstName: item.firstName.trim(),
          lastName: item.lastName.trim(),
          jobTitle: item.jobTitle.trim(),
          phone: item.phone.trim(),
          mobile: item.mobile.trim(),
          email: item.email.trim().toLowerCase(),
        }))
        .filter((item) =>
          [item.firstName, item.lastName, item.email, item.phone, item.mobile].some(Boolean),
        );

      const emails = form.emails
        .map((item) => ({ ...item, email: item.email.trim().toLowerCase() }))
        .filter((item) => item.email);

      const primaryContact = contacts[0];
      const checkedAt =
        form.vatNumberStatus === "Geldig"
          ? new Date().toISOString().slice(0, 10)
          : "";

      const supplierData: Omit<Supplier, "id" | "status"> = {
        supplierNumber: form.supplierNumber.trim(),
        companyName: form.companyName.trim(),
        tradeName: form.tradeName.trim(),
        website: form.website.trim(),
        chamberOfCommerceNumber: form.chamberOfCommerceNumber.trim(),
        vatNumber: form.vatNumber.trim().toUpperCase(),
        vatNumberStatus: form.vatNumberStatus,
        vatNumberCheckedAt: checkedAt,
        eoriNumber: form.eoriNumber.trim().toUpperCase(),
        language: form.language,
        currency: form.currency.trim().toUpperCase() || "EUR",
        customerType: form.customerType,
        transactionNature: form.transactionNature,
        street: form.street.trim(),
        houseNumber: form.houseNumber.trim(),
        houseNumberAddition: form.houseNumberAddition.trim(),
        postalCode: form.postalCode.trim().toUpperCase(),
        city: form.city.trim(),
        province: form.province.trim(),
        country: form.country,
        paymentDays: Number(form.paymentDays) || 30,
        iban: form.iban.replace(/\s+/g, "").toUpperCase(),
        bic: form.bic.replace(/\s+/g, "").toUpperCase(),
        incoterm: form.incoterm.trim().toUpperCase(),
        leadTimeDays: Number(form.leadTimeDays) || 0,
        minimumOrderQuantity: Number(form.minimumOrderQuantity) || 0,
        minimumOrderValue: Number(form.minimumOrderValue) || 0,
        warehouse: form.warehouse.trim(),
        purchaseConditions: form.purchaseConditions.trim(),
        notes: form.notes.trim(),
        contactPerson: primaryContact
          ? [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(" ")
          : "",
        email: emails[0]?.email ?? primaryContact?.email ?? "",
        phone: primaryContact?.phone || primaryContact?.mobile || "",
        contacts,
        emails,
      };

      if (editingId) {
        commit(
          items.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...supplierData,
                  supplierNumber: supplierData.supplierNumber || item.supplierNumber,
                }
              : item,
          ),
        );
        setMessage("Leverancier bijgewerkt.");
      } else {
        const supplierNumber =
          supplierData.supplierNumber ||
          `LEV-${String(items.length + 1).padStart(4, "0")}`;

        commit([
          ...items,
          {
            ...supplierData,
            id: createMasterId("supplier", form.companyName),
            supplierNumber,
            status: "Actief",
          },
        ]);
        setMessage("Leverancier toegevoegd.");
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

  function toggleSupplierStatus(supplier: Supplier) {
    commit(
      items.map((item) =>
        item.id === supplier.id
          ? { ...item, status: item.status === "Actief" ? "Inactief" : "Actief" }
          : item,
      ),
    );
    setMessage(
      supplier.status === "Actief"
        ? "Leverancier op inactief gezet."
        : "Leverancier opnieuw geactiveerd.",
    );
    setError("");
  }

  function deleteSupplier(supplier: Supplier) {
    const history = getSupplierHistoryCheck(supplier.id);
    if (!history.canDelete) {
      setError(history.message);
      setMessage("");
      return;
    }

    if (!window.confirm(`Leverancier ${supplier.companyName} definitief verwijderen?`)) {
      return;
    }

    commit(items.filter((item) => item.id !== supplier.id));
    setMessage("Leverancier definitief verwijderd.");
    setError("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Relaties"
        title="Leveranciers"
        description="Beheer leveranciers, contactpersonen, e-mailadressen en inkoopafspraken."
        action={
          <button type="button" className="button button-primary" onClick={startCreate}>
            + Leverancier
          </button>
        }
      />

      {message && <div className={styles.success}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {showForm && (
        <section className={`content-card ${styles.formCard}`}>
          <div className="content-card-header">
            <div>
              <h2>{editingId ? "Leverancier bewerken" : "Nieuwe leverancier"}</h2>
              <p>Alle bestaande leveranciersinformatie blijft behouden.</p>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Algemeen</h3>
            <div className={styles.formGrid}>
              <Field label="Leveranciersnummer">
                <input value={form.supplierNumber} onChange={(e) => updateForm({ supplierNumber: e.target.value })} placeholder="Automatisch bij leeg laten" />
              </Field>
              <Field label="Bedrijfsnaam *">
                <input value={form.companyName} onChange={(e) => updateForm({ companyName: e.target.value })} />
              </Field>
              <Field label="Handelsnaam">
                <input value={form.tradeName} onChange={(e) => updateForm({ tradeName: e.target.value })} />
              </Field>
              <Field label="Website">
                <input value={form.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="https://" />
              </Field>
              <Field label="KvK-nummer">
                <input value={form.chamberOfCommerceNumber} onChange={(e) => updateForm({ chamberOfCommerceNumber: e.target.value })} />
              </Field>
              <Field label="BTW-nummer">
                <input value={form.vatNumber} onChange={(e) => updateForm({ vatNumber: e.target.value, vatNumberStatus: "Niet gecontroleerd" })} />
              </Field>
              <Field label="EORI-nummer">
                <input value={form.eoriNumber} onChange={(e) => updateForm({ eoriNumber: e.target.value })} />
              </Field>
              <Field label="Taal">
                <select value={form.language} onChange={(e) => updateForm({ language: e.target.value as RelationLanguage })}>
                  {relationLanguages.map((language) => <option key={language}>{language}</option>)}
                </select>
              </Field>
              <Field label="Valuta">
                <input value={form.currency} onChange={(e) => updateForm({ currency: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Adres</h3>
            <div className={styles.formGrid}>
              <Field label="Straat"><input value={form.street} onChange={(e) => updateForm({ street: e.target.value })} /></Field>
              <Field label="Huisnummer"><input value={form.houseNumber} onChange={(e) => updateForm({ houseNumber: e.target.value })} /></Field>
              <Field label="Toevoeging"><input value={form.houseNumberAddition} onChange={(e) => updateForm({ houseNumberAddition: e.target.value })} /></Field>
              <Field label="Postcode"><input value={form.postalCode} onChange={(e) => updateForm({ postalCode: e.target.value })} /></Field>
              <Field label="Plaats"><input value={form.city} onChange={(e) => updateForm({ city: e.target.value })} /></Field>
              <Field label="Provincie"><input value={form.province} onChange={(e) => updateForm({ province: e.target.value })} /></Field>
              <Field label="Land">
                <select value={form.country} onChange={(e) => updateForm({ country: e.target.value })}>
                  {commonCountries.map((country) => <option key={country}>{country}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Financieel</h3>
            <div className={styles.formGrid}>
              <Field label="Betaaltermijn (dagen)"><input type="number" min="0" value={form.paymentDays} onChange={(e) => updateForm({ paymentDays: e.target.value })} /></Field>
              <Field label="IBAN"><input value={form.iban} onChange={(e) => updateForm({ iban: e.target.value })} /></Field>
              <Field label="BIC"><input value={form.bic} onChange={(e) => updateForm({ bic: e.target.value })} /></Field>
              <Field label="Incoterm"><input value={form.incoterm} onChange={(e) => updateForm({ incoterm: e.target.value })} placeholder="Bijv. DDP" /></Field>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Inkoop</h3>
            <div className={styles.formGrid}>
              <Field label="Levertijd (dagen)"><input type="number" min="0" value={form.leadTimeDays} onChange={(e) => updateForm({ leadTimeDays: e.target.value })} /></Field>
              <Field label="MOQ"><input type="number" min="0" value={form.minimumOrderQuantity} onChange={(e) => updateForm({ minimumOrderQuantity: e.target.value })} /></Field>
              <Field label="Minimum orderwaarde"><input type="number" min="0" step="0.01" value={form.minimumOrderValue} onChange={(e) => updateForm({ minimumOrderValue: e.target.value })} /></Field>
              <Field label="Magazijn"><input value={form.warehouse} onChange={(e) => updateForm({ warehouse: e.target.value })} /></Field>
            </div>
            <div className={styles.textAreaGrid}>
              <Field label="Levervoorwaarden"><textarea value={form.purchaseConditions} onChange={(e) => updateForm({ purchaseConditions: e.target.value })} /></Field>
              <Field label="Notities"><textarea value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} /></Field>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div><h3>Contactpersonen</h3><p>Voeg zoveel contactpersonen toe als nodig.</p></div>
              <button type="button" className="button button-secondary" onClick={addContact}>+ Contactpersoon</button>
            </div>
            <div className={styles.contactList}>
              {form.contacts.map((contact) => (
                <div key={contact.id} className={styles.contactCard}>
                  <div className={styles.formGrid}>
                    <Field label="Voornaam"><input value={contact.firstName} onChange={(e) => updateContact(contact.id, { firstName: e.target.value })} /></Field>
                    <Field label="Achternaam"><input value={contact.lastName} onChange={(e) => updateContact(contact.id, { lastName: e.target.value })} /></Field>
                    <Field label="Functie"><input value={contact.jobTitle} onChange={(e) => updateContact(contact.id, { jobTitle: e.target.value })} /></Field>
                    <Field label="Telefoon"><input value={contact.phone} onChange={(e) => updateContact(contact.id, { phone: e.target.value })} /></Field>
                    <Field label="Mobiel"><input value={contact.mobile} onChange={(e) => updateContact(contact.id, { mobile: e.target.value })} /></Field>
                    <Field label="E-mailadres"><input type="email" value={contact.email} onChange={(e) => updateContact(contact.id, { email: e.target.value })} /></Field>
                  </div>
                  <div className={styles.inlineActions}>
                    <label className={styles.checkField}><input type="checkbox" checked={contact.active} onChange={(e) => updateContact(contact.id, { active: e.target.checked })} /><span>Actief</span></label>
                    <button type="button" className={styles.removeEmail} onClick={() => removeContact(contact.id)}>Verwijderen</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div><h3>E-mailadressen</h3><p>Gebruik verschillende adressen voor bestellingen, facturen, retouren en kwaliteit.</p></div>
              <button type="button" className="button button-secondary" onClick={addEmailAddress}>+ E-mailadres</button>
            </div>
            <div className={styles.emailList}>
              {form.emails.map((item) => (
                <div key={item.id} className={styles.emailRow}>
                  <Field label="E-mailadres"><input type="email" value={item.email} onChange={(e) => updateEmailAddress(item.id, { email: e.target.value })} placeholder="orders@leverancier.nl" /></Field>
                  <Field label="Type">
                    <select value={item.purpose} onChange={(e) => updateEmailAddress(item.id, { purpose: e.target.value as SupplierEmailPurpose })}>
                      <option>Algemeen</option><option>Bestellingen</option><option>Facturen</option><option>Retouren</option><option>Kwaliteit</option><option>Contactpersoon</option>
                    </select>
                  </Field>
                  <label className={styles.checkField}><input type="checkbox" checked={item.receivesPurchaseOrders} onChange={(e) => updateEmailAddress(item.id, { receivesPurchaseOrders: e.target.checked })} /><span>Inkooporders</span></label>
                  <label className={styles.checkField}><input type="checkbox" checked={item.defaultCc} onChange={(e) => updateEmailAddress(item.id, { defaultCc: e.target.checked })} /><span>Standaard CC</span></label>
                  <label className={styles.checkField}><input type="checkbox" checked={item.active} onChange={(e) => updateEmailAddress(item.id, { active: e.target.checked })} /><span>Actief</span></label>
                  <button type="button" className={styles.removeEmail} onClick={() => removeEmailAddress(item.id)}>Verwijderen</button>
                </div>
              ))}
            </div>
          </div>

          {!isNetherlands(form.country) && (
            <div className={`${styles.section} ${styles.foreignSection}`}>
              <div className={styles.sectionHeader}>
                <div><h3>Buitenlandse btw-gegevens</h3><p>Nodig voor correcte fiscale verwerking.</p></div>
                <a href={viesCheckUrl} target="_blank" rel="noreferrer" className="button button-secondary">Controleer via VIES ↗</a>
              </div>
              <div className={styles.formGrid}>
                <Field label="Controle-status">
                  <select value={form.vatNumberStatus} onChange={(e) => updateForm({ vatNumberStatus: e.target.value as VatNumberStatus })}>
                    <option>Niet gecontroleerd</option><option>Geldig</option><option>Ongeldig</option>
                  </select>
                </Field>
                <Field label="Transactietype">
                  <select value={form.transactionNature} onChange={(e) => updateForm({ transactionNature: e.target.value as "Goederen" | "Diensten" })}>
                    <option>Goederen</option><option>Diensten</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" className="button button-secondary" onClick={resetForm}>Annuleren</button>
            <button type="button" className="button button-primary" onClick={saveSupplier}>{editingId ? "Wijzigingen opslaan" : "Leverancier opslaan"}</button>
          </div>
        </section>
      )}

      <section className="content-card">
        <div className="content-card-toolbar">
          <div className="table-search"><span>⌕</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek leverancier, contactpersoon, land of btw-nummer..." /></div>
          <select className={styles.filter} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option>Actief</option><option>Inactief</option><option>Alles</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Nummer</th><th>Leverancier</th><th>Contact</th><th>Land</th><th>BTW-nummer</th><th>Betaaltermijn</th><th>Status</th><th /></tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{item.supplierNumber}</td>
                  <td className="table-primary">{item.companyName}<div className={styles.meta}>{item.tradeName || item.city || "—"}</div></td>
                  <td>{item.contactPerson || "—"}<div className={styles.meta}>{item.email || "—"}</div></td>
                  <td>{item.country}</td>
                  <td>{item.vatNumber || "—"}</td>
                  <td>{item.paymentDays} dagen</td>
                  <td><StatusBadge label={item.status} tone={item.status === "Actief" ? "success" : "neutral"} /></td>
                  <td className="table-number"><div className={styles.rowActions}>
                    <button type="button" onClick={() => startEdit(item)}>Bewerken</button>
                    <button type="button" onClick={() => toggleSupplierStatus(item)}>{item.status === "Actief" ? "Inactief zetten" : "Activeren"}</button>
                    <button type="button" className={styles.deleteAction} onClick={() => deleteSupplier(item)}>Verwijderen</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className={styles.empty}>Geen leveranciers gevonden.</div>}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span>{label}</span>{children}</label>;
}
