import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}


function rec(v: unknown): Row {
  return v && typeof v === "object"
    ? v as Row
    : {};
}

function num(v: unknown) {
  return Number.isFinite(Number(v))
    ? Number(v)
    : 0;
}

function lineFromRow(row: Row) {
  const p = rec(row.profile);

  return {
    ...p,
    id: String(row.id ?? ""),
    variantId: String(row.variant_id ?? p.variantId ?? ""),
    quantity: num(row.quantity),
    deliveredQuantity: num(row.delivered_quantity),
    reservedQuantity: num(row.reserved_quantity),
    unitPrice: num(row.unit_price),
    discountPercentage: num(row.discount_percentage),
  };
}

function orderFromRow(row: Row) {
  const p = rec(row.profile);

  return {
    ...p,
    id: String(row.id ?? ""),
    orderNumber: String(row.order_number ?? ""),
    orderDate: String(row.order_date ?? ""),
    status: String(row.status ?? "Concept"),
    notes: String(row.notes ?? ""),
    lines: Array.isArray(row.sales_order_lines)
      ? (row.sales_order_lines as Row[]).map(lineFromRow)
      : [],
  };
}

async function getContext() {
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

  const { data: memberships } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true);

  const organizationId =
    String(
      memberships?.[0]?.organization_id ?? "",
    );

  if (!organizationId) {
    throw new ApiError(
      "Geen actieve organisatie gevonden.",
      403,
    );
  }

  return {
    supabase,
    organizationId,
  };
}

export async function GET() {
  try {
    const {
      supabase,
      organizationId,
    } = await getContext();

    const { data: invoices } =
      await supabase
        .from("invoices")
        .select("sales_order_id")
        .eq(
          "organization_id",
          organizationId,
        );

    const invoicedOrderIds = new Set(
      (invoices ?? [])
        .map((item: Row) =>
          String(item.sales_order_id ?? ""),
        )
        .filter(Boolean),
    );

    const { data, error } =
      await supabase
        .from("sales_orders")
        .select(`
          *,
          sales_order_lines(*)
        `)
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "status",
          [
            "Bevestigd",
            "Verzonden",
          ],
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    if (error) {
      throw new ApiError(error.message);
    }

    return NextResponse.json(
      (data ?? [])
        .filter(
          (order) =>
            !invoicedOrderIds.has(
              String(order.id),
            ),
        )
        .map((order) =>
          orderFromRow(order as Row),
        ),
    );
  } catch (error) {
    const e =
      error instanceof ApiError
        ? error
        : new ApiError(
            error instanceof Error
              ? error.message
              : "Verkooporders ophalen mislukt.",
          );

    return NextResponse.json(
      {
        error: e.message,
      },
      {
        status: e.status,
      },
    );
  }
}
