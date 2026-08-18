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
      "Je sessie is verlopen.",
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
            : "Goedkeuren betaling mislukt.",
        );

  return NextResponse.json(
    { error: e.message },
    { status: e.status },
  );
}

export async function POST(
  _: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      paymentId: string;
    }>;
  },
) {
  try {
    const {
      id,
      paymentId,
    } = await params;

    const {
      supabase,
      organizationId,
      user,
    } = await context();

    const { data: payment, error } =
      await supabase
        .from("invoice_payments")
        .select("*")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", paymentId)
        .eq("invoice_id", id)
        .maybeSingle();

    if (error) {
      throw new ApiError(error.message);
    }

    if (!payment) {
      throw new ApiError(
        "Betaling niet gevonden.",
        404,
      );
    }

    if (payment.status === "Approved") {
      throw new ApiError(
        "Deze betaling is al goedgekeurd.",
        400,
      );
    }

    const { error: paymentUpdateError } =
      await supabase
        .from("invoice_payments")
        .update({
          status: "Approved",
          approved_at:
            new Date().toISOString(),
          approved_by: user.id,
        })
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", paymentId);

    if (paymentUpdateError) {
      throw new ApiError(
        paymentUpdateError.message,
      );
    }

    const { data: approvedPayments } =
      await supabase
        .from("invoice_payments")
        .select("amount")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("invoice_id", id)
        .eq("status", "Approved");

    const { data: invoice } =
      await supabase
        .from("invoices")
        .select("total")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", id)
        .maybeSingle();

    if (invoice) {
      const paid =
        (approvedPayments ?? []).reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(item.amount ?? 0),
          0,
        );

      const status =
        paid >= Number(invoice.total)
          ? "Betaald"
          : "Deels betaald";

      await supabase
        .from("invoices")
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", id);
    }

    return NextResponse.json({
      ok: true,
      status: "Approved",
    });
  } catch (error) {
    return response(error);
  }
}
