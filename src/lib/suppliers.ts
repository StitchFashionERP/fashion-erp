import type { RelationLanguage } from "@/lib/language";
import type { CustomerType, VatNumberStatus } from "@/lib/vat-engine";
import {
  isBrowser,
  readStoredArray,
  subscribeToStorageEvent,
  writeStoredArray,
} from "@/lib/storage";

export type SupplierEmailPurpose =
  | "Algemeen"
  | "Bestellingen"
  | "Facturen"
  | "Retouren"
  | "Kwaliteit"
  | "Contactpersoon";

export type SupplierEmail = {
  id: string;
  email: string;
  purpose: SupplierEmailPurpose;
  receivesPurchaseOrders: boolean;
  defaultCc: boolean;
  active: boolean;
};

export type SupplierContact = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  mobile: string;
  email: string;
  active: boolean;
};

export type Supplier = {
  id: string;
  supplierNumber: string;

  companyName: string;
  tradeName: string;
  website: string;
  chamberOfCommerceNumber: string;
  vatNumber: string;
  vatNumberStatus: VatNumberStatus;
  vatNumberCheckedAt: string;
  eoriNumber: string;
  language: RelationLanguage;
  currency: string;
  customerType: CustomerType;
  transactionNature: "Goederen" | "Diensten";

  street: string;
  houseNumber: string;
  houseNumberAddition: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;

  paymentDays: number;
  iban: string;
  bic: string;
  incoterm: string;

  leadTimeDays: number;
  minimumOrderQuantity: number;
  minimumOrderValue: number;
  warehouse: string;
  purchaseConditions: string;
  notes: string;

  contactPerson: string;
  email: string;
  phone: string;
  contacts: SupplierContact[];
  emails: SupplierEmail[];

  status: "Actief" | "Inactief";
};

const STORAGE_KEY = "stitch-suppliers-v1";
const CHANGE_EVENT = "stitch-suppliers-change";
const MASTER_DATA_STORAGE_KEY = "stitch-master-data-v1";

function normalizeSupplierEmail(
  value: Record<string, unknown>,
  index: number,
): SupplierEmail {
  return {
    id: String(value.id ?? `supplier-email-${index + 1}`),
    email: String(value.email ?? ""),
    purpose: (value.purpose ?? "Algemeen") as SupplierEmailPurpose,
    receivesPurchaseOrders: Boolean(
      value.receivesPurchaseOrders ?? value.purchaseOrders ?? false,
    ),
    defaultCc: Boolean(value.defaultCc ?? false),
    active: value.active !== false,
  };
}

function normalizeSupplierContact(
  value: Record<string, unknown>,
  index: number,
): SupplierContact {
  const fullName = String(value.name ?? value.contactPerson ?? "").trim();
  const [firstName = "", ...lastNameParts] = fullName.split(/\s+/);

  return {
    id: String(value.id ?? `supplier-contact-${index + 1}`),
    firstName: String(value.firstName ?? firstName),
    lastName: String(value.lastName ?? lastNameParts.join(" ")),
    jobTitle: String(value.jobTitle ?? value.role ?? value.function ?? ""),
    phone: String(value.phone ?? ""),
    mobile: String(value.mobile ?? ""),
    email: String(value.email ?? ""),
    active: value.active !== false,
  };
}

function normalizeSupplier(value: Record<string, unknown>, index = 0): Supplier {
  const legacyEmail = String(value.email ?? "");
  const legacyContactPerson = String(value.contactPerson ?? "");

  const storedEmails = Array.isArray(value.emails)
    ? value.emails
        .map((item, emailIndex) =>
          normalizeSupplierEmail((item ?? {}) as Record<string, unknown>, emailIndex),
        )
        .filter((item) => item.email.trim())
    : [];

  const emails =
    storedEmails.length > 0
      ? storedEmails
      : legacyEmail
        ? [
            {
              id: `supplier-email-${index + 1}-legacy`,
              email: legacyEmail,
              purpose: "Algemeen" as SupplierEmailPurpose,
              receivesPurchaseOrders: true,
              defaultCc: false,
              active: true,
            },
          ]
        : [];

  const storedContacts = Array.isArray(value.contacts)
    ? value.contacts
        .map((item, contactIndex) =>
          normalizeSupplierContact(
            (item ?? {}) as Record<string, unknown>,
            contactIndex,
          ),
        )
        .filter((item) =>
          [item.firstName, item.lastName, item.email, item.phone, item.mobile].some(
            (field) => field.trim(),
          ),
        )
    : [];

  const contacts =
    storedContacts.length > 0
      ? storedContacts
      : legacyContactPerson
        ? [
            {
              id: `supplier-contact-${index + 1}-legacy`,
              firstName: legacyContactPerson,
              lastName: "",
              jobTitle: "",
              phone: String(value.phone ?? ""),
              mobile: "",
              email: legacyEmail,
              active: true,
            },
          ]
        : [];

  return {
    id: String(value.id ?? ""),
    supplierNumber: String(
      value.supplierNumber ?? `LEV-${String(index + 1).padStart(4, "0")}`,
    ),

    companyName: String(value.companyName ?? value.name ?? ""),
    tradeName: String(value.tradeName ?? ""),
    website: String(value.website ?? ""),
    chamberOfCommerceNumber: String(
      value.chamberOfCommerceNumber ?? value.kvkNumber ?? value.registrationNo ?? "",
    ),
    vatNumber: String(value.vatNumber ?? ""),
    vatNumberStatus: (value.vatNumberStatus ??
      "Niet gecontroleerd") as VatNumberStatus,
    vatNumberCheckedAt: String(value.vatNumberCheckedAt ?? ""),
    eoriNumber: String(value.eoriNumber ?? value.eori ?? ""),
    language: (value.language ?? "Nederlands") as RelationLanguage,
    currency: String(value.currency ?? "EUR"),
    customerType: (value.customerType ?? "Zakelijk") as CustomerType,
    transactionNature: (value.transactionNature ?? "Goederen") as
      | "Goederen"
      | "Diensten",

    street: String(value.street ?? ""),
    houseNumber: String(value.houseNumber ?? ""),
    houseNumberAddition: String(
      value.houseNumberAddition ?? value.addition ?? "",
    ),
    postalCode: String(value.postalCode ?? ""),
    city: String(value.city ?? ""),
    province: String(value.province ?? value.state ?? ""),
    country: String(value.country ?? "Nederland"),

    paymentDays: Number(value.paymentDays ?? 30),
    iban: String(value.iban ?? ""),
    bic: String(value.bic ?? ""),
    incoterm: String(value.incoterm ?? ""),

    leadTimeDays: Number(value.leadTimeDays ?? value.leadTime ?? 0),
    minimumOrderQuantity: Number(value.minimumOrderQuantity ?? value.moq ?? 0),
    minimumOrderValue: Number(value.minimumOrderValue ?? 0),
    warehouse: String(value.warehouse ?? ""),
    purchaseConditions: String(value.purchaseConditions ?? ""),
    notes: String(value.notes ?? ""),

    contactPerson:
      contacts.length > 0
        ? [contacts[0].firstName, contacts[0].lastName].filter(Boolean).join(" ")
        : legacyContactPerson,
    email: emails[0]?.email ?? legacyEmail,
    phone: String(value.phone ?? contacts[0]?.phone ?? contacts[0]?.mobile ?? ""),
    contacts,
    emails,

    status: (value.status ??
      (value.active === false || value.isActive === false
        ? "Inactief"
        : "Actief")) as "Actief" | "Inactief",
  };
}

function readLegacyMasterDataSuppliers(): Supplier[] {
  if (!isBrowser()) return [];

  const raw = window.localStorage.getItem(MASTER_DATA_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as { suppliers?: unknown };
    if (!Array.isArray(parsed.suppliers)) return [];

    return parsed.suppliers.map((value, index) =>
      normalizeSupplier((value ?? {}) as Record<string, unknown>, index),
    );
  } catch {
    return [];
  }
}

export function getSuppliers(): Supplier[] {
  const stored = readStoredArray(
    [STORAGE_KEY, "stitch-suppliers", "fashion-erp-suppliers", "suppliers"],
    normalizeSupplier,
  );

  if (stored) return stored;

  const migrated = readLegacyMasterDataSuppliers();
  if (migrated.length > 0) saveSuppliers(migrated);

  return migrated;
}

export function saveSuppliers(suppliers: Supplier[]): void {
  writeStoredArray(STORAGE_KEY, CHANGE_EVENT, suppliers);
}

export function subscribeToSuppliers(callback: () => void): () => void {
  return subscribeToStorageEvent(CHANGE_EVENT, callback);
}
