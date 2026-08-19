import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { increaseStock } from "@/lib/stock-service";
import { getDefaultStockLocation } from "@/lib/stock-location";

class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

async function context() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError(
      "Je sessie is verlopen.",
      401,
    );
  }

  const { data } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .single();

  if (!data?.organization_id) {
    throw new ApiError(
      "Geen organisatie gevonden.",
      403,
    );
  }

  return {
    supabase,
    organizationId:
      data.organization_id,
  };
}


export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const {
      supabase,
      organizationId,
    } = await context();

    const { id } = await params;

    const body =
      await request.json();

    const receivedByLine =
      body.receivedByLine ?? {};

    const { data: order, error } =
      await supabase
        .from("purchase_orders")
        .select(`
          *,
          purchase_order_lines(*)
        `)
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", id)
        .single();

    if (error || !order) {
      throw new ApiError(
        "Inkooporder niet gevonden.",
        404,
      );
    }

    const location =
      await getDefaultStockLocation(
        organizationId,
      );

    const { count } =
      await supabase
        .from("purchase_receipts")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          },
        )
        .eq(
          "organization_id",
          organizationId,
        );

    const receiptNumber =
      `GR-${String((count ?? 0) + 1).padStart(5, "0")}`;

    const { data: receipt, error: receiptError } =
      await supabase
        .from("purchase_receipts")
        .insert({
          organization_id:
            organizationId,
          receipt_number:
            receiptNumber,
          purchase_order_id:
            order.id,
          receipt_date:
            body.receiptDate ||
            new Date()
              .toISOString()
              .slice(0, 10),
          packing_slip_number:
            body.packingSlipNumber || "",
          received_by:
            body.receivedBy || "",
          notes:
            body.notes || "",
        })
        .select("*")
        .single();

    if (receiptError) {
      throw new ApiError(
        receiptError.message,
      );
    }

    const receiptLines = [];

    for (
      const line of order.purchase_order_lines
    ) {
      const quantity =
        Number(
          receivedByLine[line.id] ?? 0,
        );

      if (quantity <= 0) {
        continue;
      }

      await increaseStock({
        organizationId,
        variantId:
          line.variant_id,
        locationId:
          location.id,
        quantity,
        movementType:
          "GOODS_RECEIPT",
        referenceType:
          "PURCHASE_RECEIPT",
        referenceId:
          receipt.id,
      });

      await supabase
        .from("purchase_order_lines")
        .update({
          received_quantity:
            Number(
              line.received_quantity,
            ) + quantity,
        })
        .eq(
          "id",
          line.id,
        );

      receiptLines.push({
        organization_id:
          organizationId,
        purchase_receipt_id:
          receipt.id,
        purchase_order_line_id:
          line.id,
        variant_id:
          line.variant_id,
        product_id:
          line.product_id ?? null,
        sku:
          line.sku ?? "",
        product_name:
          line.product_name ?? "",
        color:
          line.color ?? "",
        size:
          line.size ?? "",
        quantity,
      });
    }

    if (receiptLines.length > 0) {
      await supabase
        .from("purchase_receipt_lines")
        .insert(receiptLines);
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ontvangst mislukt.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
