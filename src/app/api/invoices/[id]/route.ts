import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invoiceFromRow } from "@/lib/invoice-mapper";

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
            : "Factuuractie mislukt.",
        );

  return NextResponse.json(
    { error: e.message },
    { status: e.status },
  );
}

export async function GET(
  _: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;

    console.log(
      "INVOICE DETAIL REQUEST",
      id,
    );

    const {
      supabase,
      organizationId,
    } = await context();

    const { data, error } =
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
        .eq("id", id)
        .maybeSingle();

    if (error) {
      throw new ApiError(error.message);
    }

    if (!data) {
      console.log(
        "INVOICE DETAIL RESULT",
        data,
      );

      throw new ApiError(
        "Factuur niet gevonden.",
        404,
      );
    }

    return NextResponse.json(
      invoiceFromRow(data as Row),
    );
  } catch (error) {
    return response(error);
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;

    console.log(
      "INVOICE DETAIL REQUEST",
      id,
    );
    const input = await request.json() as Row;

    const {
      supabase,
      organizationId,
    } = await context();

    const update: Row = {
      updated_at: new Date().toISOString(),
    };

    if (typeof input.status === "string") {
      update.status = input.status;
    }

    if (typeof input.sentAt === "string") {
      update.profile = {
        sentAt: input.sentAt,
      };
    }

    const { error } =
      await supabase
        .from("invoices")
        .update(update)
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", id);

    if (error) {
      throw new ApiError(error.message);
    }

    const { data, error: readError } =
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
        .eq("id", id)
        .maybeSingle();

    if (readError) {
      throw new ApiError(readError.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    return response(error);
  }
}

export async function DELETE(
  _: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;

    console.log(
      "INVOICE DETAIL REQUEST",
      id,
    );

    const {
      supabase,
      organizationId,
    } = await context();

    const { data } =
      await supabase
        .from("invoices")
        .select("status")
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", id)
        .maybeSingle();

    if (!data) {
      console.log(
        "INVOICE DETAIL RESULT",
        data,
      );

      throw new ApiError(
        "Factuur niet gevonden.",
        404,
      );
    }

    if (
      data.status === "Verzonden" ||
      data.status === "Betaald" ||
      data.status === "Deels betaald" ||
      data.status === "Gecrediteerd"
    ) {
      throw new ApiError(
        "Deze factuur kan niet worden verwijderd. Maak een creditnota aan.",
        400,
      );
    }

    const { error } =
      await supabase
        .from("invoices")
        .delete()
        .eq(
          "organization_id",
          organizationId,
        )
        .eq("id", id);

    if (error) {
      throw new ApiError(error.message);
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return response(error);
  }
}
