export type SupplierStatus = "Actief" | "Inactief";
export type PaymentMode = "net" | "split";
export type PaymentMoment = "Voor levering" | "Bij levering" | "Na factuurdatum";

export type SupplierContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type SplitPaymentTerm = {
  id: string;
  percentage: number;
  moment: PaymentMoment;
  days: number;
};

export type Supplier = {
  id: string;
  supplierNumber: string;
  companyName: string;
  status: SupplierStatus;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  vatNumber: string;
  eoriNumber: string;
  currency: string;
  moq: number | null;
  mov: number | null;
  leadTimeDays: number | null;
  paymentMode: PaymentMode;
  paymentDays: number;
  discountDays: number | null;
  discountPercentage: number | null;
  splitPaymentTerms: SplitPaymentTerm[];
  contacts: SupplierContact[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierInput = Omit<Supplier, "id" | "createdAt" | "updatedAt">;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function mapSupplierRow(row: Record<string, unknown>): Supplier {
  return {
    id: asString(row.id),
    supplierNumber: asString(row.supplier_number),
    companyName: asString(row.company_name),
    status: row.active === false ? "Inactief" : "Actief",
    address: asString(row.address),
    postalCode: asString(row.postal_code),
    city: asString(row.city),
    country: asString(row.country),
    email: asString(row.email),
    phone: asString(row.phone),
    website: asString(row.website),
    vatNumber: asString(row.vat_number),
    eoriNumber: asString(row.eori_number),
    currency: asString(row.currency) || "EUR",
    moq: asOptionalNumber(row.moq),
    mov: asOptionalNumber(row.mov),
    leadTimeDays: asOptionalNumber(row.lead_time_days),
    paymentMode: row.payment_mode === "split" ? "split" : "net",
    paymentDays: Number(row.payment_days) || 30,
    discountDays: asOptionalNumber(row.discount_days),
    discountPercentage: asOptionalNumber(row.discount_percentage),
    splitPaymentTerms: Array.isArray(row.split_payment_terms)
      ? (row.split_payment_terms as SplitPaymentTerm[])
      : [],
    contacts: Array.isArray(row.contacts)
      ? (row.contacts as SupplierContact[])
      : [],
    notes: asString(row.notes),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function supplierInputToRow(input: SupplierInput) {
  return {
    supplier_number: input.supplierNumber.trim(),
    company_name: input.companyName.trim(),
    active: input.status === "Actief",
    address: input.address.trim() || null,
    postal_code: input.postalCode.trim() || null,
    city: input.city.trim() || null,
    country: input.country.trim() || "Nederland",
    country_code: input.country === "Nederland" ? "NL" : "",
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    website: input.website.trim() || null,
    vat_number: input.vatNumber.trim().toUpperCase() || null,
    eori_number: input.eoriNumber.trim().toUpperCase() || null,
    currency: input.currency.trim().toUpperCase() || "EUR",
    moq: input.moq,
    mov: input.mov,
    lead_time_days: input.leadTimeDays,
    payment_mode: input.paymentMode,
    payment_days: input.paymentDays,
    discount_days: input.discountDays,
    discount_percentage: input.discountPercentage,
    split_payment_terms: input.splitPaymentTerms,
    contacts: input.contacts,
    notes: input.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export function validateSupplierInput(input: SupplierInput) {
  if (!input.companyName.trim()) throw new Error("Vul een bedrijfsnaam in.");
  if (!input.supplierNumber.trim()) throw new Error("Vul een leveranciersnummer in.");

  if (input.paymentMode === "split") {
    if (input.splitPaymentTerms.length === 0) {
      throw new Error("Voeg minimaal één betaaldeel toe.");
    }
    const total = input.splitPaymentTerms.reduce(
      (sum, term) => sum + Number(term.percentage || 0),
      0,
    );
    if (Math.abs(total - 100) > 0.001) {
      throw new Error("De betaalpercentages moeten samen 100% zijn.");
    }
  }
}
