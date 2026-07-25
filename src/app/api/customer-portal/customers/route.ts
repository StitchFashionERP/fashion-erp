import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";
import { createClient } from "@/lib/supabase/server";

type CustomerPayload = {
  customer: Record<string, unknown>;
  crm?: Record<string, unknown>;
};

function rowToCustomer(row: Record<string, unknown>) {
  const profile = (row.profile && typeof row.profile === "object" ? row.profile : {}) as Record<string, unknown>;
  return {
    ...profile,
    id: String(row.legacy_id ?? row.id ?? ""),
    customerNumber: String(row.customer_number ?? ""),
    companyName: String(row.company_name ?? ""),
    contactPerson: String(row.contact_person ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    city: String(row.city ?? ""),
    country: String(profile.country ?? row.country_code ?? "Nederland"),
    chamberOfCommerceNumber: String(row.chamber_of_commerce_number ?? ""),
    vatNumber: String(row.vat_number ?? ""),
    language: String(profile.language ?? row.language ?? "Nederlands"),
    paymentDays: Number(row.payment_days ?? 30),
    status: row.active === false ? "Inactief" : "Actief",
  };
}

function customerToRow(organizationId: string, payload: CustomerPayload) {
  const customer = payload.customer;
  return {
    organization_id: organizationId,
    legacy_id: String(customer.id ?? "") || null,
    customer_number: String(customer.customerNumber ?? ""),
    company_name: String(customer.companyName ?? ""),
    contact_person: String(customer.contactPerson ?? "") || null,
    email: String(customer.email ?? "") || null,
    phone: String(customer.phone ?? "") || null,
    city: String(customer.city ?? "") || null,
    country_code: String(customer.countryCode ?? "NL"),
    chamber_of_commerce_number: String(customer.chamberOfCommerceNumber ?? "") || null,
    vat_number: String(customer.vatNumber ?? "") || null,
    language: String(customer.language ?? "Nederlands"),
    payment_days: Number(customer.paymentDays ?? 30),
    active: customer.status !== "Inactief",
    profile: { ...customer, crm: payload.crm ?? null },
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("company_name");

    if (error) throw error;
    return NextResponse.json((data ?? []).map((row) => rowToCustomer(row)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Klanten ophalen is mislukt." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CustomerPayload;
    if (!payload.customer?.companyName || !payload.customer?.customerNumber) {
      return NextResponse.json({ error: "Klantnummer en bedrijfsnaam zijn verplicht." }, { status: 400 });
    }

    const organization = await getCurrentOrganization();
    const supabase = await createClient();
    const row = customerToRow(organization.id, payload);
    const { data, error } = await supabase
      .from("customers")
      .upsert(row, { onConflict: "organization_id,customer_number" })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(rowToCustomer(data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Klant opslaan is mislukt." },
      { status: 500 },
    );
  }
}
