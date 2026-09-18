import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { data, error } = await supabase
    .from("sales_deliveries")
    .select(`
      *,
      sales_orders(
        order_number,
        customers(
          company_name,
          contact_person,
          email,
          city
        )
      ),
      sales_delivery_lines(
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
    sales_delivery_lines: (data.sales_delivery_lines ?? []).map(
      (line: Record<string, unknown>) => {
        const variant = line.product_variants as
          | Record<string, unknown>
          | undefined;
        const product = variant?.products as
          | Record<string, unknown>
          | undefined;

        return {
          id: line.id,
          variant_id: line.variant_id,
          product_id: line.product_id ?? "",
          product_name:
            line.product_name || product?.name || "",
          product_code: product?.product_code ?? "",
          sku: line.sku || variant?.sku || "",
          color: line.color || variant?.color || "",
          size: line.size || variant?.size || "",
          quantity: Number(line.quantity ?? 0),
        };
      },
    ),
  });
}
