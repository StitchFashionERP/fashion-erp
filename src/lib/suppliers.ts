import type { RelationLanguage } from "@/lib/language";
import type { CustomerType, VatNumberStatus } from "@/lib/vat-engine";
import {
  isBrowser,
  readStoredArray,
  subscribeToStorageEvent,
  writeStoredArray,
} from "@/lib/storage";

export type Supplier = {
  id: string;
  supplierNumber: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  customerType: CustomerType;
  vatNumber: string;
  vatNumberStatus: VatNumberStatus;
  vatNumberCheckedAt: string;
  transactionNature: "Goederen" | "Diensten";
  language: RelationLanguage;
  paymentDays: number;
  status: "Actief" | "Inactief";
};

const STORAGE_KEY = "stitch-suppliers-v1";
const CHANGE_EVENT = "stitch-suppliers-change";
const MASTER_DATA_STORAGE_KEY = "stitch-master-data-v1";

function normalizeSupplier(value: Record<string, unknown>, index = 0): Supplier {
  return {
    id: String(value.id ?? ""),
    supplierNumber: String(
      value.supplierNumber ?? `LEV-${String(index + 1).padStart(4, "0")}`,
    ),
    companyName: String(value.companyName ?? value.name ?? ""),
    contactPerson: String(value.contactPerson ?? ""),
    email: String(value.email ?? ""),
    phone: String(value.phone ?? ""),
    country: String(value.country ?? "Nederland"),
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
  if (migrated.length > 0) {
    saveSuppliers(migrated);
  }

  return migrated;
}

export function saveSuppliers(suppliers: Supplier[]): void {
  writeStoredArray(STORAGE_KEY, CHANGE_EVENT, suppliers);
}

export function subscribeToSuppliers(callback: () => void): () => void {
  return subscribeToStorageEvent(CHANGE_EVENT, callback);
}
