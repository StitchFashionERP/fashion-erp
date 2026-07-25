import type {
  Dispatch,
  SetStateAction,
} from "react";

export type SupplierStatus =
  | "Actief"
  | "Inactief";

export type SupplierTab =
  | "Algemeen"
  | "Contactpersonen"
  | "Adressen"
  | "Financieel"
  | "Notities";

export type AddressType =
  | "Bezoekadres"
  | "Factuuradres"
  | "Afleveradres"
  | "Postadres"
  | "Retouradres"
  | "Overig";

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  emails: string[];
  phones: string[];
  primary: boolean;
  notes: string;
};

export type Address = {
  id: string;
  label: string;
  type: AddressType;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  email: string;
  phone: string;
  primary: boolean;
  notes: string;
  instructions: string;
};

export type PaymentMoment =
  | "Voor levering"
  | "Bij levering"
  | "Na factuurdatum";

export type PaymentTerm = {
  id: string;
  description: string;
  percentage: number;
  moment: PaymentMoment;
  days: number;
  discountPercentage: number;
};

export type SupplierNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  organizationId: string;
  supplierNumber: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  vatNumber: string;
  eoriNumber: string;
  currency: string;
  moq: number | null;
  mov: number | null;
  leadTimeDays: number | null;
  contacts: Contact[];
  addresses: Address[];
  paymentTerms: PaymentTerm[];
  notes: SupplierNote[];
  status: SupplierStatus;
};

export type SetSupplier = Dispatch<
  SetStateAction<Supplier>
>;

export const supplierTabs: SupplierTab[] = [
  "Algemeen",
  "Contactpersonen",
  "Adressen",
  "Financieel",
  "Notities",
];

export const supplierCountries = [
  "Nederland",
  "België",
  "Duitsland",
  "Frankrijk",
  "Luxemburg",
  "Oostenrijk",
  "Zwitserland",
  "Verenigd Koninkrijk",
  "Denemarken",
  "Zweden",
  "Noorwegen",
  "Spanje",
  "Portugal",
  "Italië",
  "Polen",
  "Tsjechië",
  "Turkije",
  "China",
  "India",
  "Vietnam",
  "Bangladesh",
  "Pakistan",
  "Verenigde Staten",
  "Canada",
  "Overig",
] as const;

export function createSupplierId(
  prefix: string,
): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createEmptyContact(): Contact {
  return {
    id: createSupplierId("contact"),
    firstName: "",
    lastName: "",
    role: "",
    department: "",
    emails: [""],
    phones: [""],
    primary: false,
    notes: "",
  };
}

export function createEmptyAddress(): Address {
  return {
    id: createSupplierId("address"),
    label: "",
    type: "Bezoekadres",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    province: "",
    country: "Nederland",
    email: "",
    phone: "",
    primary: false,
    notes: "",
    instructions: "",
  };
}

export function createEmptyPaymentTerm(): PaymentTerm {
  return {
    id: createSupplierId("payment-term"),
    description: "Volledige betaling",
    percentage: 100,
    moment: "Na factuurdatum",
    days: 30,
    discountPercentage: 0,
  };
}

export function createEmptySupplier(): Supplier {
  return {
    id: "",
    organizationId: "",
    supplierNumber: "",
    companyName: "",
    email: "",
    phone: "",
    website: "",
    vatNumber: "",
    eoriNumber: "",
    currency: "EUR",
    moq: null,
    mov: null,
    leadTimeDays: null,
    contacts: [],
    addresses: [],
    paymentTerms: [
      createEmptyPaymentTerm(),
    ],
    notes: [],
    status: "Actief",
  };
}