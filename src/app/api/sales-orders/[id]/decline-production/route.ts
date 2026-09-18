import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultStockLocation } from "@/lib/stock-location";
import { releaseBatch } from "@/lib/fulfillment/allocate-stock";

class ApiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

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
      productId?: string;
      color?: string;
    };

    const productId = String(body.productId ?? "");
    const color = String(body.color ?? "");

    if (!productId || !color) {
      throw new ApiError("Artikel en kleur zijn verplicht.", 400);
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
        "Deze order kan in de huidige status niet worden aangepast.",
        400,
      );
    }

    const { data: lines, error: linesError } = await supabase
      .from("sales_order_lines")
      .select(
        "id, variant_id, quantity, delivered_quantity, reserved_quantity, unit_price, discount_percentage, profile",
      )
      .eq("organization_id", organizationId)
      .eq("sales_order_id", id);

    if (linesError) throw new ApiError(linesError.message);

    const matching = (lines ?? []).filter((line) => {
      const profile = rec(line.profile);
      return (
        String(profile.productId ?? "") === productId &&
        String(profile.color ?? "") === color
      );
    });

    if (matching.length === 0) {
      throw new ApiError(
        "Geen orderregels gevonden voor dit artikel en deze kleur.",
        404,
      );
    }

    const location = await getDefaultStockLocation(organizationId);
    const releases: Array<{ variantId: string; quantity: number }> = [];
    const lineUpdates: Array<Record<string, unknown>> = [];

    for (const line of matching) {
      const quantity = num(line.quantity);
      const deliveredQuantity = num(line.delivered_quantity);
      const reservedQuantity = num(line.reserved_quantity);
      const newQuantity = Math.min(quantity, deliveredQuantity);

      if (newQuantity >= quantity) {
        // Already fully delivered (or already at 0): nothing left to reduce.
        continue;
      }

      const profile = rec(line.profile);

      lineUpdates.push({
        id: line.id,
        quantity: newQuantity,
        reserved_quantity: 0,
        line_total:
          newQuantity *
          num(line.unit_price) *
          (1 - num(line.discount_percentage) / 100),
        profile: {
          ...profile,
          originalQuantity: num(
            profile.originalQuantity ?? quantity,
          ),
        },
      });

      if (reservedQuantity > 0) {
        releases.push({
          variantId: String(line.variant_id),
          quantity: reservedQuantity,
        });
      }
    }

    if (lineUpdates.length === 0) {
      throw new ApiError(
        "Deze regels staan al op 0 of zijn al volledig geleverd.",
        400,
      );
    }

    await releaseBatch(supabase, organizationId, location.id, releases);

    for (const update of lineUpdates) {
      const { error: updateError } = await supabase
        .from("sales_order_lines")
        .update(update)
        .eq("id", update.id);

      if (updateError) throw new ApiError(updateError.message);
    }

    const { data: freshLines, error: freshLinesError } = await supabase
      .from("sales_order_lines")
      .select("quantity, unit_price, discount_percentage")
      .eq("organization_id", organizationId)
      .eq("sales_order_id", id);

    if (freshLinesError) throw new ApiError(freshLinesError.message);

    const subtotal = (freshLines ?? []).reduce(
      (sum, line) =>
        sum +
        num(line.quantity) *
          num(line.unit_price) *
          (1 - num(line.discount_percentage) / 100),
      0,
    );

    const { error: orderUpdateError } = await supabase
      .from("sales_orders")
      .update({
        subtotal,
        vat: subtotal * 0.21,
        total: subtotal * 1.21,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", id);

    if (orderUpdateError) throw new ApiError(orderUpdateError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const e =
      error instanceof ApiError
        ? error
        : new ApiError(
            error instanceof Error
              ? error.message
              : "Aanpassen is mislukt.",
          );

    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
