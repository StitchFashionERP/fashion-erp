import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Geen gebruiker." },
      { status: 401 },
    );
  }

  const { data, error } =
    await supabase
      .from("purchase_receipts")
      .select(`
        *,
        purchase_receipt_lines(*)
      `)
      .eq(
        "purchase_order_id",
        id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    (data ?? []).map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receipt_number,
      purchaseOrderId: receipt.purchase_order_id,
      receiptDate: receipt.receipt_date,
      packingSlipNumber:
        receipt.packing_slip_number ?? "",
      receivedBy:
        receipt.received_by ?? "",
      notes:
        receipt.notes ?? "",
      createdAt:
        receipt.created_at,
      lines:
        (receipt.purchase_receipt_lines ?? []).map(
          (line: any) => ({
            id: line.id,
            purchaseOrderLineId:
              line.purchase_order_line_id,
            productId:
              line.product_id ?? "",
            variantId:
              line.variant_id,
            sku:
              line.sku ?? "",
            productName:
              line.product_name ?? "",
            color:
              line.color ?? "",
            size:
              line.size ?? "",
            quantity:
              Number(line.quantity ?? 0),
          }),
        ),
    })),
  );
}
