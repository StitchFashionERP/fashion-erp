import type { RelationLanguage } from "@/lib/language";
import type { CustomerType, VatNumberStatus } from "@/lib/vat-engine";

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
  crm?: Record<string, unknown> | null;
};

export type CustomerMasterData = Customer;

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "De klantbewerking is mislukt.");
  return body;
}

export async function getCustomers(): Promise<Customer[]> {
  return parseResponse<Customer[]>(await fetch("/api/customers", { cache: "no-store" }));
}

export async function saveCustomerCloud(
  customer: Customer,
  crm?: Record<string, unknown>,
): Promise<Customer> {
  return parseResponse<Customer>(
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, crm }),
    }),
  );
}

export async function deleteCustomerCloud(id: string): Promise<void> {
  await parseResponse<{ ok: boolean }>(
    await fetch(`/api/customers/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}
