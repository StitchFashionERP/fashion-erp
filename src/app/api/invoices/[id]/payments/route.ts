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
  };
}

function response(error: unknown) {
  const e =
    error instanceof ApiError
      ? error
      : new ApiError(
          error instanceof Error
            ? error.message
            : "Betaling registreren mislukt.",
        );

  return NextResponse.json(
    { error: e.message },
    { status: e.status },
  );
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;
    const input = await request.json() as Row;

    const amount = Number(input.amount ?? 0);

    if (amount <= 0) {
      throw new ApiError(
        "Het betaalde bedrag moet groter zijn dan nul.",
        400,
      );
    }

    const {
      supabase,
      organizationId,
    } = await context();

    const { data: invoice, error: invoiceError } =
      await supabase
        .from("invoices")
        .select("total,status")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", id)
        .maybeSingle();

    if (invoiceError) {
      throw new ApiError(invoiceError.message);
    }

    if (!invoice) {
      throw new ApiError(
        "Factuur niet gevonden.",
        404,
      );
    }

    const { data: payments, error: paymentsError } =
      await supabase
        .from("invoice_payments")
        .select("amount")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("invoice_id", id);

    if (paymentsError) {
      throw new ApiError(paymentsError.message);
    }

    const paid =
      (payments ?? []).reduce(
        (total, payment) =>
          total + Number(payment.amount ?? 0),
        0,
      );

    const remaining = Math.max(
      0,
      Number(invoice.total) - paid,
    );

    const paymentAmount = Math.min(
      amount,
      remaining,
    );

    const { error: insertError } =
      await supabase
        .from("invoice_payments")
        .insert({
          organization_id: organizationId,
          invoice_id: id,
          payment_date: String(
            input.paymentDate ??
              new Date()
                .toISOString()
                .slice(0, 10),
          ),
          amount: paymentAmount,
          method: String(
            input.method ?? "",
          ),
          reference: String(
            input.reference ?? "",
          ),
        });

    if (insertError) {
      throw new ApiError(insertError.message);
    }

    return NextResponse.json({
      ok: true,
      status: "Pending",
    });
  } catch (error) {
    return response(error);
  }
}
