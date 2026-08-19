import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimNextNumberServer } from "@/lib/number-series-server";

type Row = Record<string, unknown>;

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
      "Je sessie is verlopen. Log opnieuw in.",
      401,
    );
  }

  const { data: memberships, error } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true);

  if (error) {
    throw new ApiError(error.message);
  }

  const ids = (memberships ?? [])
    .map((item: Row) =>
      String(item.organization_id ?? ""),
    )
    .filter(Boolean);

  if (!ids.length) {
    throw new ApiError(
      "Er is geen actieve organisatie gekoppeld.",
      403,
    );
  }

  return {
    supabase,
    organizationId: ids[0],
    user,
  };
}

function response(error: unknown) {
  const e =
    error instanceof ApiError
      ? error
      : new ApiError(
          error instanceof Error
            ? error.message
            : "Factuur maken mislukt.",
        );

  return NextResponse.json(
    { error: e.message },
    {
      status: e.status,
    },
  );
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Row;

    const salesOrderId = String(
      input.salesOrderId ?? "",
    );

    if (!salesOrderId) {
      throw new ApiError(
        "Verkooporder ontbreekt.",
        400,
      );
    }

    const {
      supabase,
      organizationId,
      user,
    } = await context();

    const { data: order, error: orderError } =
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
        .eq("id", salesOrderId)
        .maybeSingle();

    if (orderError) {
      throw new ApiError(orderError.message);
    }

    if (!order) {
      throw new ApiError(
        "Verkooporder niet gevonden.",
        404,
      );
    }

    if (
      order.status !== "Bevestigd" &&
      order.status !== "Verzonden"
    ) {
      throw new ApiError(
        "Alleen bevestigde of verzonden verkooporders kunnen worden gefactureerd.",
        400,
      );
    }

    const { data: existing } =
      await supabase
        .from("invoices")
        .select("id")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq(
          "sales_order_id",
          salesOrderId,
        )
        .maybeSingle();

    if (existing) {
      throw new ApiError(
        "Voor deze verkooporder bestaat al een factuur.",
        400,
      );
    }

    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .select("*")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq(
          "id",
          order.customer_id,
        )
        .maybeSingle();

    if (customerError) {
      throw new ApiError(customerError.message);
    }

    const now = new Date();
    const invoiceDate = now.toISOString().slice(0, 10);

    const invoiceNumber =
      await claimNextNumberServer("invoice");

    const lines = [];

    for (const line of order.sales_order_lines ?? []) {
      const { data: variant } =
        await supabase
          .from("product_variants")
          .select(`
            *,
            products(*)
          `)
          .eq(
            "organization_id",
            organizationId,
          )
          .eq(
            "id",
            line.variant_id,
          )
          .maybeSingle();

      const product =
        Array.isArray(variant?.products)
          ? variant.products[0]
          : variant?.products ?? {};

      const lineSubtotal =
        Number(line.quantity) *
        Number(line.unit_price) *
        (
          1 -
          Number(line.discount_percentage) / 100
        );

      lines.push({
        organization_id: organizationId,
        variant_id: line.variant_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage:
          line.discount_percentage,
        line_total: lineSubtotal,
        profile: {
          productId: variant?.product_id ?? "",
          productCode:
            product.product_code ??
            product.profile?.code ??
            product.code ??
            "",
          productName: product.name ?? "",
          sku: variant?.sku ?? "",
          color: variant?.color ?? "",
          colorCode: variant?.color_code ?? "",
          size: variant?.size ?? "",
          vatCode: product.vat_code ?? "2V",
        },
      });
    }

    const subtotal = lines.reduce(
      (sum, line) =>
        sum + Number(line.line_total),
      0,
    );

    const vat = subtotal * 0.21;
    const total = subtotal + vat;

    const { data: invoice, error: invoiceError } =
      await supabase
        .from("invoices")
        .insert({
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          customer_id: order.customer_id,
          sales_order_id: salesOrderId,
          invoice_date: invoiceDate,
          status: "Concept",
          subtotal,
          vat,
          total,
          outstanding_amount: total,
          created_by: user.id,
          profile: {
            customerName:
              customer?.company_name ?? "",
            salesOrderNumber:
              order.order_number,
          },
        })
        .select("*")
        .single();

    if (invoiceError) {
      throw new ApiError(invoiceError.message);
    }

    const { error: linesError } =
      await supabase
        .from("invoice_lines")
        .insert(
          lines.map((line) => ({
            ...line,
            invoice_id: invoice.id,
          })),
        );

    if (linesError) {
      throw new ApiError(linesError.message);
    }

    const { data: completeInvoice, error: readError } =
      await supabase
        .from("invoices")
        .select(`
          *,
          invoice_lines(*),
          invoice_payments(*)
        `)
        .eq(
          "organization_id",
          organizationId,
        )
        .eq(
          "id",
          invoice.id,
        )
        .single();

    if (readError) {
      throw new ApiError(readError.message);
    }

    console.log(
      "CREATED INVOICE",
      completeInvoice.id,
      completeInvoice.invoice_number,
    );

    return NextResponse.json(completeInvoice, {
      status: 201,
    });
  } catch (error) {
    return response(error);
  }
}
