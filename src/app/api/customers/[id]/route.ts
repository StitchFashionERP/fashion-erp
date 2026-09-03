import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

async function context() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError(
      "Je sessie is verlopen. Log opnieuw in.",
      401,
    );
  }

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) throw new ApiError(error.message);

  const organizationId = String(
    memberships?.[0]?.organization_id ?? "",
  );

  if (!organizationId) {
    throw new ApiError(
      "Geen actieve organisatie gevonden.",
      403,
    );
  }

  return { supabase, organizationId };
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function response(error: unknown) {
  const e =
    error instanceof ApiError
      ? error
      : new ApiError(
          error instanceof Error
            ? error.message
            : "Klant verwijderen mislukt.",
        );

  return NextResponse.json(
    { error: e.message },
    { status: e.status },
  );
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, organizationId } = await context();

    let query = supabase
      .from("customers")
      .select("id, legacy_id, company_name")
      .eq("organization_id", organizationId);

    query = isUuid(id)
      ? query.or(`id.eq.${id},legacy_id.eq.${id}`)
      : query.eq("legacy_id", id);

    const { data: customer, error } = await query.maybeSingle();

    if (error) throw new ApiError(error.message);

    if (!customer) {
      throw new ApiError(
        "Klant niet gevonden.",
        404,
      );
    }

    const { count: orderCount } = await supabase
      .from("sales_orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("organization_id", organizationId)
      .eq("customer_id", customer.id);

    if ((orderCount ?? 0) > 0) {
      throw new ApiError(
        "Deze klant kan niet verwijderd worden omdat er verkooporders aan gekoppeld zijn.",
        400,
      );
    }

    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", customer.id);

    if (deleteError) {
      throw new ApiError(deleteError.message);
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return response(error);
  }
}
