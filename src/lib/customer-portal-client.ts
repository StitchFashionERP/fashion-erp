"use client";

import type {
  CustomerPortalSummary,
  PortalCompanySnapshot,
  PortalOrderSnapshot,
} from "@/lib/customer-portal-types";

export async function createCustomerPortal(
  input: {
    order: PortalOrderSnapshot;
    company: PortalCompanySnapshot;
    pdfFilename: string;
    pdfBase64: string;
    expiresInDays?: number;
  },
) {
  const response = await fetch(
    "/api/customer-portal",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload.error ||
        "Het klantportaal kon niet worden aangemaakt.",
    );
  }

  return payload as CustomerPortalSummary;
}

export async function getPortalStatus(
  token: string,
) {
  const response = await fetch(
    `/api/customer-portal/${encodeURIComponent(
      token,
    )}/status`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}
