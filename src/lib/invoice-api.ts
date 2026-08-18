import type { Invoice } from "@/lib/invoices";

export type { Invoice } from "@/lib/invoices";

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    url,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Factuuractie mislukt.",
    );
  }

  return data as T;
}

export async function getInvoices(): Promise<
  Invoice[]
> {
  return request<Invoice[]>(
    "/api/invoices",
  );
}

export async function getInvoiceById(
  id: string,
): Promise<Invoice | null> {
  return request<Invoice>(
    `/api/invoices/${id}`,
  );
}

export async function makeInvoiceFinal(
  id: string,
): Promise<Invoice> {
  return request<Invoice>(
    `/api/invoices/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "Definitief",
      }),
    },
  );
}

export async function markInvoiceSent(
  id: string,
): Promise<Invoice> {
  return request<Invoice>(
    `/api/invoices/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "Verzonden",
        sentAt:
          new Date().toISOString(),
      }),
    },
  );
}

export async function deleteInvoice(
  id: string,
): Promise<void> {
  await request(
    `/api/invoices/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function registerInvoicePayment(
  invoiceId: string,
  input: {
    paymentDate: string;
    amount: number;
    method: string;
    reference: string;
  },
) {
  return request<{
    ok: boolean;
    status: string;
  }>(
    `/api/invoices/${invoiceId}/payments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}


export function getInvoicePaidAmount(
  invoice: Invoice,
) {
  return invoice.payments.reduce(
    (total, payment) =>
      total + payment.amount,
    0,
  );
}

export function getInvoiceOutstandingAmount(
  invoice: Invoice,
) {
  return Math.max(
    0,
    invoice.total - getInvoicePaidAmount(invoice),
  );
}
