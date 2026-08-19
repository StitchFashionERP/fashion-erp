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
        purchase_orders(
          order_number,
          suppliers(
            supplier_number,
            company_name,
            contact_person,
            email,
            phone,
            address,
            postal_code,
            city,
            country_code
          )
        ),
        purchase_receipt_lines(
          *,
          product_variants(
            sku,
            color,
            size,
            products(
              product_code,
              name
            )
          )
        )
      `)
      .eq("id", id)
      .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...data,
    purchase_receipt_lines:
      (data.purchase_receipt_lines ?? []).map(
        (line: any) => ({
          id: line.id,
          variant_id:
            line.variant_id,
          product_id:
            line.product_id ??
            line.product_variants?.product_id ??
            "",
          product_name:
            line.product_variants?.products?.name ??
            "",
          product_code:
            line.product_variants?.products?.product_code ??
            "",
          sku:
            line.product_variants?.sku ??
            "",
          color:
            line.product_variants?.color ??
            "",
          size:
            line.product_variants?.size ??
            "",
          quantity:
            Number(line.quantity ?? 0),
        }),
      ),
  });
}
