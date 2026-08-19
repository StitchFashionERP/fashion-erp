import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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
        purchase_orders(
          order_number,
          suppliers(
            company_name
          )
        ),
        purchase_receipt_lines(*)
      `)
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

  console.log("PURCHASE RECEIPTS COUNT:", data?.length);
  console.log("PURCHASE RECEIPTS DATA:", data);

  return NextResponse.json(
    (data ?? []).map((receipt) => ({
      id: receipt.id,
      receiptNumber:
        receipt.receipt_number,
      purchaseOrderId:
        receipt.purchase_order_id,
      purchaseOrderNumber:
        receipt.purchase_orders?.order_number ?? "",
      supplierName:
        receipt.purchase_orders?.suppliers?.company_name ?? "",
      receiptDate:
        receipt.receipt_date,
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
            variantId:
              line.variant_id,
            productId:
              line.product_id ?? "",
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
