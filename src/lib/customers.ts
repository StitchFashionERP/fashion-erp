import type { RelationLanguage } from "@/lib/language";
import type { CustomerType, VatNumberStatus } from "@/lib/vat-engine";
import {
  readStoredArray,
  subscribeToStorageEvent,
  writeStoredArray,
} from "@/lib/storage";

export type Customer = {
  id: string;
  customerNumber: string;
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
  vatNumberCheckedAt: string;
  transactionNature: "Goederen" | "Diensten";
  language: RelationLanguage;
  paymentDays: number;
  paymentDiscountPercentage: number;
  paymentDiscountDays: number;
  discountPercentage: number;
  priceListId: string;
  status: "Actief" | "Inactief";
};

export type CustomerMasterData = Customer;

const STORAGE_KEY = "stitch-customers-v1";
const CHANGE_EVENT = "stitch-customers-change";

function normalizeCustomer(value: Record<string, unknown>): Customer {
  return {
    id: String(value.id ?? ""),
    customerNumber: String(value.customerNumber ?? ""),
    companyName: String(value.companyName ?? value.name ?? ""),
    contactPerson: String(value.contactPerson ?? ""),
    email: String(value.email ?? ""),
    phone: String(value.phone ?? ""),
    city: String(value.city ?? ""),
    country: String(value.country ?? "Nederland"),
    chamberOfCommerceNumber: String(value.chamberOfCommerceNumber ?? ""),
    customerType: (value.customerType ?? "Zakelijk") as CustomerType,
    vatNumber: String(value.vatNumber ?? ""),
    vatNumberStatus: (value.vatNumberStatus ??
      "Niet gecontroleerd") as VatNumberStatus,
    vatNumberCheckedAt: String(value.vatNumberCheckedAt ?? ""),
    transactionNature: (value.transactionNature ?? "Goederen") as
      | "Goederen"
      | "Diensten",
    language: (value.language ?? "Nederlands") as RelationLanguage,
    paymentDays: Number(value.paymentDays ?? 30),
    paymentDiscountPercentage: Number(value.paymentDiscountPercentage ?? 0),
    paymentDiscountDays: Number(value.paymentDiscountDays ?? 0),
    discountPercentage: Number(value.discountPercentage ?? 0),
    priceListId: String(value.priceListId ?? "price-list-standard"),
    status: (value.status ??
      (value.active === false ? "Inactief" : "Actief")) as
      | "Actief"
      | "Inactief",
  };
}

export function getCustomers(): Customer[] {
  return (
    readStoredArray(
      [
        STORAGE_KEY,
        "stitch-customers",
        "fashion-erp-customers",
        "customers",
      ],
      normalizeCustomer,
    ) ?? []
  );
}

export function saveCustomers(customers: Customer[]): void {
  writeStoredArray(STORAGE_KEY, CHANGE_EVENT, customers);
}

export function subscribeToCustomers(callback: () => void): () => void {
  return subscribeToStorageEvent(CHANGE_EVENT, callback);
}
