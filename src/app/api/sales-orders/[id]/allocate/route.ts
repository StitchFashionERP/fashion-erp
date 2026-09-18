import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultStockLocation } from "@/lib/stock-location";
import { reserveBatchForOrder } from "@/lib/fulfillment/allocate-stock";

class ApiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

async function context() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError("Je sessie is verlopen. Log opnieuw in.", 401);
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) throw new ApiError(error.message);

  const ids = (data ?? [])
    .map((m) => String(m.organization_id ?? ""))
    .filter(Boolean);

  if (!ids.length) {
    throw new ApiError("Er is geen actieve organisatie gekoppeld.", 403);
  }

  return { supabase, organizationId: ids[0] };
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, organizationId } = await context();

    const { data: order, error } = await supabase
      .from("sales_orders")
      .select("status")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new ApiError(error.message);
    if (!order) throw new ApiError("Verkooporder niet gevonden.", 404);

    if (!["Bevestigd", "Gereserveerd"].includes(String(order.status))) {
      throw new ApiError(
        "Alleen bevestigde of gereserveerde orders kunnen worden gealloceerd.",
        400,
      );
    }

    const location = await getDefaultStockLocation(organizationId);

    await reserveBatchForOrder(supabase, organizationId, location.id, id);

    const { error: statusError } = await supabase
      .from("sales_orders")
      .update({
        status: "Gereserveerd",
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", id);

    if (statusError) throw new ApiError(statusError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const e =
      error instanceof ApiError
        ? error
        : new ApiError(
            error instanceof Error
              ? error.message
              : "Voorraad alloceren mislukt.",
          );

    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
