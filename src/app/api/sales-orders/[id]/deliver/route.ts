import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultStockLocation } from "@/lib/stock-location";
import { shipStock } from "@/lib/stock-service";

class ApiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      lines?: Array<{ id: string; quantity: number }>;
    };

    const requested = Array.isArray(body.lines) ? body.lines : [];

    if (requested.length === 0) {
      throw new ApiError("Geen aantallen om te leveren.", 400);
    }

    const { supabase, organizationId } = await context();

    const { data: order, error: orderError } = await supabase
      .from("sales_orders")
      .select("status")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    if (orderError) throw new ApiError(orderError.message);
    if (!order) throw new ApiError("Verkooporder niet gevonden.", 404);

    if (
      !["Bevestigd", "Gereserveerd", "Gereed"].includes(
        String(order.status),
      )
    ) {
      throw new ApiError(
        "Deze order kan in de huidige status niet worden uitgeleverd.",
        400,
      );
    }

    const { data: lines, error: linesError } = await supabase
      .from("sales_order_lines")
      .select("id, variant_id, quantity, delivered_quantity, reserved_quantity")
      .eq("organization_id", organizationId)
      .eq("sales_order_id", id);

    if (linesError) throw new ApiError(linesError.message);

    const linesById = new Map(
      (lines ?? []).map((line) => [String(line.id), line]),
    );

    const location = await getDefaultStockLocation(organizationId);

    for (const requestedLine of requested) {
      const line = linesById.get(String(requestedLine.id));

      if (!line) {
        throw new ApiError("Onbekende orderregel.", 400);
      }

      const remainingNeed = Math.max(
        0,
        num(line.quantity) - num(line.delivered_quantity),
      );

      const deliverable = Math.min(
        num(line.reserved_quantity),
        remainingNeed,
      );

      const quantity = Math.max(
        0,
        Math.min(num(requestedLine.quantity), deliverable),
      );

      if (quantity <= 0) continue;

      await shipStock({
        organizationId,
        variantId: String(line.variant_id),
        locationId: location.id,
        quantity,
        referenceType: "SALES_ORDER",
        referenceId: id,
      });

      const { error: updateError } = await supabase
        .from("sales_order_lines")
        .update({
          delivered_quantity: num(line.delivered_quantity) + quantity,
          reserved_quantity: num(line.reserved_quantity) - quantity,
        })
        .eq("id", line.id);

      if (updateError) throw new ApiError(updateError.message);
    }

    const { data: freshLines, error: freshLinesError } = await supabase
      .from("sales_order_lines")
      .select("quantity, delivered_quantity")
      .eq("organization_id", organizationId)
      .eq("sales_order_id", id);

    if (freshLinesError) throw new ApiError(freshLinesError.message);

    const fullyDelivered = (freshLines ?? []).every(
      (line) => num(line.delivered_quantity) >= num(line.quantity),
    );

    if (fullyDelivered) {
      const { error: statusError } = await supabase
        .from("sales_orders")
        .update({
          status: "Verzonden",
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId)
        .eq("id", id);

      if (statusError) throw new ApiError(statusError.message);
    }

    return NextResponse.json({ ok: true, fullyDelivered });
  } catch (error) {
    const e =
      error instanceof ApiError
        ? error
        : new ApiError(
            error instanceof Error
              ? error.message
              : "Uitleveren mislukt.",
          );

    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
