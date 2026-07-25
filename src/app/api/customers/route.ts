import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CustomerPayload = {
  customer: Record<string, unknown>;
  crm?: Record<string, unknown>;
};

type ApiContext = {
  organizationId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function rowToCustomer(row: Record<string, unknown>) {
  const profile = asRecord(row.profile);

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
    chamberOfCommerceNumber: String(
      row.chamber_of_commerce_number ?? "",
    ),
    customerType: String(profile.customerType ?? "Zakelijk"),
    vatNumber: String(row.vat_number ?? ""),
    vatNumberStatus: String(
      profile.vatNumberStatus ?? "Niet gecontroleerd",
    ),
    vatNumberCheckedAt: String(profile.vatNumberCheckedAt ?? ""),
    transactionNature: String(
      profile.transactionNature ?? "Goederen",
    ),
    language: String(
      profile.language ?? row.language ?? "Nederlands",
    ),
    paymentDays: Number(row.payment_days ?? 30),
    paymentDiscountPercentage: Number(
      profile.paymentDiscountPercentage ?? 0,
    ),
    paymentDiscountDays: Number(
      profile.paymentDiscountDays ?? 0,
    ),
    discountPercentage: Number(profile.discountPercentage ?? 0),
    priceListId: String(
      profile.priceListId ?? "price-list-standard",
    ),
    status: row.active === false ? "Inactief" : "Actief",
    crm: asRecord(profile.crm),
  };
}

function customerToRow(
  organizationId: string,
  payload: CustomerPayload,
) {
  const customer = payload.customer;

  return {
    organization_id: organizationId,
    legacy_id: String(customer.id ?? "") || null,
    customer_number: String(customer.customerNumber ?? ""),
    company_name: String(customer.companyName ?? ""),
    contact_person:
      String(customer.contactPerson ?? "") || null,
    email: String(customer.email ?? "") || null,
    phone: String(customer.phone ?? "") || null,
    city: String(customer.city ?? "") || null,
    country_code: String(customer.countryCode ?? "NL"),
    chamber_of_commerce_number:
      String(customer.chamberOfCommerceNumber ?? "") || null,
    vat_number: String(customer.vatNumber ?? "") || null,
    language: String(customer.language ?? "Nederlands"),
    payment_days: Number(customer.paymentDays ?? 30),
    active: customer.status !== "Inactief",
    profile: {
      ...customer,
      crm: payload.crm ?? customer.crm ?? null,
    },
    updated_at: new Date().toISOString(),
  };
}

async function getApiContext(): Promise<ApiContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiError("Je sessie is verlopen. Log opnieuw in.", 401);
  }

  const { data: memberships, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true);

  if (membershipError) {
    throw new ApiError(membershipError.message, 500);
  }

  const organizationIds = (memberships ?? [])
    .map((membership) =>
      String(membership.organization_id ?? ""),
    )
    .filter(Boolean);

  if (organizationIds.length === 0) {
    throw new ApiError(
      "Er is geen actieve organisatie aan dit account gekoppeld.",
      403,
    );
  }

  const { data: preferences, error: preferenceError } =
    await supabase
      .from("user_preferences")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (preferenceError) {
    throw new ApiError(preferenceError.message, 500);
  }

  const preferredOrganizationId = String(
    preferences?.active_organization_id ?? "",
  );

  const organizationId = organizationIds.includes(
    preferredOrganizationId,
  )
    ? preferredOrganizationId
    : organizationIds[0];

  return { organizationId, supabase };
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "De klantbewerking is mislukt.",
    },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const { organizationId, supabase } = await getApiContext();

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", organizationId)
      .order("company_name");

    if (error) {
      throw new ApiError(error.message, 500);
    }

    return NextResponse.json(
      (data ?? []).map((row) =>
        rowToCustomer(row as Record<string, unknown>),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CustomerPayload;

    if (
      !payload.customer?.companyName ||
      !payload.customer?.customerNumber
    ) {
      throw new ApiError(
        "Klantnummer en bedrijfsnaam zijn verplicht.",
        400,
      );
    }

    const { organizationId, supabase } = await getApiContext();
    const row = customerToRow(organizationId, payload);

    const { data, error } = await supabase
      .from("customers")
      .upsert(row, {
        onConflict: "organization_id,customer_number",
      })
      .select("*")
      .single();

    if (error) {
      throw new ApiError(error.message, 500);
    }

    return NextResponse.json(
      rowToCustomer(data as Record<string, unknown>),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
