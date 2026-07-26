"use client";

import { commonCountries, isNetherlands, type CustomerType, type VatNumberStatus } from "@/lib/vat-engine";
import { relationLanguages, type RelationLanguage } from "@/lib/language";
import type { ReactNode } from "react";
import styles from "../customers.module.css";

export type CustomerContact = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  isPrimary: boolean;
};

export type CustomerGeneralForm = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  street?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postalCode?: string;
  city: string;
  country: string;
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
  chamberOfCommerceNumber: string;
  customerType: CustomerType;
  vatNumber: string;
  vatNumberStatus: VatNumberStatus;
  transactionNature: "Goederen" | "Diensten";
  language: RelationLanguage;
  paymentDays?: string;
  paymentDiscountPercentage?: string;
  paymentDiscountDays?: string;
  discountPercentage?: string;
  priceListId?: string;
  pricingPolicy?: "company" | "custom";
  retailerMarkup?: string;
  invoiceEmail?: string;
  invoiceCc?: string;
  orderEmail?: string;
  orderCc?: string;
  deliveryEmail?: string;
  deliveryCc?: string;
};

type Props = { form: CustomerGeneralForm; updateForm: (changes: Partial<CustomerGeneralForm>) => void };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label><span>{label}</span>{children}</label>;
}

export function CustomerGeneralTab({ form, updateForm }: Props) {
  return <div className={styles.section}>
    <div className={styles.sectionTitle}><div><h3>Algemene gegevens</h3><p>De basisgegevens en algemene contactinformatie van deze klant.</p></div></div>
    <div className={styles.formGrid}>
      <Field label="Bedrijfsnaam"><input value={form.companyName} onChange={e => updateForm({ companyName: e.target.value })} /></Field>
      <Field label="Type klant"><select value={form.customerType} onChange={e => updateForm({ customerType: e.target.value as CustomerType })}><option>Zakelijk</option><option>Particulier</option></select></Field>
      <Field label="Taal"><select value={form.language} onChange={e => updateForm({ language: e.target.value as RelationLanguage })}>{relationLanguages.map(v => <option key={v}>{v}</option>)}</select></Field>
      <Field label="Algemene contactpersoon"><input value={form.contactPerson} onChange={e => updateForm({ contactPerson: e.target.value })} /></Field>
      <Field label="Algemeen e-mailadres"><input type="email" value={form.email} onChange={e => updateForm({ email: e.target.value })} /></Field>
      <Field label="Algemeen telefoonnummer"><input value={form.phone} onChange={e => updateForm({ phone: e.target.value })} /></Field>
    </div>
    <div className={styles.sectionTitle}><div><h3>Fiscale gegevens</h3><p>Registratie- en btw-gegevens van de klant.</p></div></div>
    <div className={styles.formGrid}>
      {isNetherlands(form.country) && <Field label="KvK-nummer"><input value={form.chamberOfCommerceNumber} onChange={e => updateForm({ chamberOfCommerceNumber: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></Field>}
      <Field label="Btw-nummer"><input value={form.vatNumber} onChange={e => updateForm({ vatNumber: e.target.value.toUpperCase(), vatNumberStatus: "Niet gecontroleerd" })} /></Field>
      <Field label="Status btw-controle"><select value={form.vatNumberStatus} onChange={e => updateForm({ vatNumberStatus: e.target.value as VatNumberStatus })}><option>Niet gecontroleerd</option><option>Geldig</option><option>Ongeldig</option></select></Field>
      <Field label="Transactietype"><select value={form.transactionNature} onChange={e => updateForm({ transactionNature: e.target.value as "Goederen" | "Diensten" })}><option>Goederen</option><option>Diensten</option></select></Field>
      <div className={styles.fullWidth}><a className={styles.textLink} href="https://ec.europa.eu/taxation_customs/vies/" target="_blank" rel="noreferrer">Controleer btw-nummer via VIES</a></div>
    </div>
  </div>;
}

export function CustomerContactsTab({ form, updateForm }: Props) {
  const contacts = form.contacts ?? [];
  const add = () => updateForm({ contacts: [...contacts, { id: `contact-${Date.now()}`, firstName: "", lastName: "", jobTitle: "", email: "", phone: "", isPrimary: contacts.length === 0 }] });
  const patch = (id: string, changes: Partial<CustomerContact>) => updateForm({ contacts: contacts.map(c => c.id === id ? { ...c, ...changes } : changes.isPrimary ? { ...c, isPrimary: false } : c) });
  const remove = (id: string) => { const next = contacts.filter(c => c.id !== id); if (next.length && !next.some(c => c.isPrimary)) next[0] = { ...next[0], isPrimary: true }; updateForm({ contacts: next }); };
  return <div className={styles.section}>
    <div className={styles.sectionTitle}><div><h3>Contactpersonen</h3><p>Contactpersonen met een eigen e-mailadres en telefoonnummer.</p></div><button className="button button-secondary" onClick={add}>+ Contactpersoon</button></div>
    {contacts.length === 0 ? <div className={styles.empty}>Nog geen contactpersonen toegevoegd.</div> : <div className={styles.cards}>{contacts.map(c => <div key={c.id} className={styles.editor}><div className={styles.formGrid}>
      <Field label="Voornaam"><input value={c.firstName} onChange={e => patch(c.id,{firstName:e.target.value})}/></Field><Field label="Achternaam"><input value={c.lastName} onChange={e => patch(c.id,{lastName:e.target.value})}/></Field><Field label="Functie"><input value={c.jobTitle} onChange={e => patch(c.id,{jobTitle:e.target.value})}/></Field><Field label="E-mailadres"><input type="email" value={c.email} onChange={e => patch(c.id,{email:e.target.value})}/></Field><Field label="Telefoon"><input value={c.phone} onChange={e => patch(c.id,{phone:e.target.value})}/></Field>
    </div><div className={styles.editorActions}><label><input type="checkbox" checked={c.isPrimary} onChange={e => patch(c.id,{isPrimary:e.target.checked})}/> Primair contact</label><button className={styles.deleteAction} onClick={() => remove(c.id)}>Verwijderen</button></div></div>)}</div>}
  </div>;
}

function AddressFields({ prefix, form, updateForm }: Props & { prefix: "" | "invoice" | "delivery" }) {
  const key = (name: string) => prefix ? `${prefix}${name[0].toUpperCase()}${name.slice(1)}` : name;
  const value = (name: string) => String((form as unknown as Record<string, unknown>)[key(name)] ?? "");
  const set = (name: string, v: string) => updateForm({ [key(name)]: v } as Partial<CustomerGeneralForm>);
  return <div className={styles.formGrid}>
    <Field label="Straat"><input value={value("street")} onChange={e=>set("street",e.target.value)}/></Field><Field label="Huisnummer"><input value={value("houseNumber")} onChange={e=>set("houseNumber",e.target.value)}/></Field><Field label="Toevoeging"><input value={value("houseNumberAddition")} onChange={e=>set("houseNumberAddition",e.target.value)}/></Field><Field label="Postcode"><input value={value("postalCode")} onChange={e=>set("postalCode",e.target.value.toUpperCase())}/></Field><Field label="Plaats"><input value={value("city")} onChange={e=>set("city",e.target.value)}/></Field><Field label="Land"><select value={value("country") || form.country} onChange={e=>set("country",e.target.value)}>{commonCountries.map(c=><option key={c}>{c}</option>)}</select></Field>
  </div>;
}

export function CustomerAddressesTab(props: Props) {
  const { form, updateForm } = props;
  return <div className={styles.section}>
    <div className={styles.sectionTitle}><div><h3>Bezoekadres</h3><p>Het primaire adres van de klant.</p></div></div><AddressFields {...props} prefix="" />
    <div className={styles.sectionTitle}><div><h3>Factuuradres</h3><p>Laat leeg wanneer dit gelijk is aan het bezoekadres.</p></div></div><AddressFields {...props} prefix="invoice" />
    <div className={styles.sectionTitle}><div><h3>Afleveradres</h3><p>Leg een afwijkend standaard afleveradres vast.</p></div></div>
    <div className={styles.checks}><label><input type="checkbox" checked={form.useDifferentDeliveryAddress ?? false} onChange={e=>updateForm({useDifferentDeliveryAddress:e.target.checked})}/> Afwijkend afleveradres gebruiken</label></div>
    {form.useDifferentDeliveryAddress && <AddressFields {...props} prefix="delivery" />}
  </div>;
}

export function CustomerFinancialTab({ form, updateForm }: Props) {
  return <div className={styles.section}>
    <div className={styles.sectionTitle}><div><h3>E-mailinstellingen</h3><p>Standaard ontvangers en CC-adressen per documentsoort. Meerdere CC-adressen scheid je met een komma.</p></div></div>
    <div className={styles.formGrid}>
      <Field label="Factuur e-mailadres"><input type="email" value={form.invoiceEmail ?? ""} placeholder={form.email || "administratie@bedrijf.nl"} onChange={e=>updateForm({invoiceEmail:e.target.value})}/></Field><Field label="CC facturen"><input value={form.invoiceCc ?? ""} placeholder="inkoop@bedrijf.nl, eigenaar@bedrijf.nl" onChange={e=>updateForm({invoiceCc:e.target.value})}/></Field><div />
      <Field label="Orderbevestiging e-mailadres"><input type="email" value={form.orderEmail ?? ""} placeholder={form.email || "inkoop@bedrijf.nl"} onChange={e=>updateForm({orderEmail:e.target.value})}/></Field><Field label="CC orderbevestigingen"><input value={form.orderCc ?? ""} onChange={e=>updateForm({orderCc:e.target.value})}/></Field><div />
      <Field label="Pakbon / verzendbericht e-mailadres"><input type="email" value={form.deliveryEmail ?? ""} placeholder={form.email || "logistiek@bedrijf.nl"} onChange={e=>updateForm({deliveryEmail:e.target.value})}/></Field><Field label="CC pakbonnen / verzendberichten"><input value={form.deliveryCc ?? ""} onChange={e=>updateForm({deliveryCc:e.target.value})}/></Field>
    </div>
    <div className={styles.sectionTitle}><div><h3>Financiële instellingen</h3><p>Betaaltermijnen, kortingen en prijsbeleid.</p></div></div>
    <div className={styles.formGrid}>
      <Field label="Betaaltermijn (dagen)"><input type="number" min="0" value={form.paymentDays ?? ""} onChange={e=>updateForm({paymentDays:e.target.value})}/></Field><Field label="Betalingskorting (%)"><input type="number" min="0" step="0.01" value={form.paymentDiscountPercentage ?? ""} onChange={e=>updateForm({paymentDiscountPercentage:e.target.value})}/></Field><Field label="Dagen betalingskorting"><input type="number" min="0" value={form.paymentDiscountDays ?? ""} onChange={e=>updateForm({paymentDiscountDays:e.target.value})}/></Field><Field label="Standaardkorting (%)"><input type="number" min="0" step="0.01" value={form.discountPercentage ?? ""} onChange={e=>updateForm({discountPercentage:e.target.value})}/></Field><Field label="Prijsbeleid"><select value={form.pricingPolicy ?? "company"} onChange={e=>updateForm({pricingPolicy:e.target.value as "company"|"custom"})}><option value="company">Bedrijfsinstellingen</option><option value="custom">Eigen retailmarkup</option></select></Field>{form.pricingPolicy === "custom" && <Field label="Retailmarkup"><input value={form.retailerMarkup ?? ""} onChange={e=>updateForm({retailerMarkup:e.target.value})}/></Field>}
    </div>
  </div>;
}

export function CustomerOrdersTab() { return <div className={styles.section}><div className={styles.empty}>Orderhistorie wordt hier gekoppeld zodra de klantkaart als detailpagina wordt opgesplitst.</div></div>; }
export function CustomerNotesTab() { return <div className={styles.section}><div className={styles.empty}>Notities worden in een volgende CRM-update aan de klantkaart gekoppeld.</div></div>; }
