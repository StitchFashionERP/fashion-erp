import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

type Row = Record<string, unknown>;

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

  const { data: preference } =
    await supabase
      .from("user_preferences")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

  const preferred =
    String(
      preference?.active_organization_id ?? "",
    );

  return {
    supabase,
    organizationId: ids.includes(preferred)
      ? preferred
      : ids[0],
  };
}

export async function GET() {
  try {
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
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    if (error) {
      throw new ApiError(error.message);
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    const e =
      error instanceof ApiError
        ? error
        : new ApiError(
            "Facturen ophalen mislukt.",
          );

    return NextResponse.json(
      { error: e.message },
      {
        status: e.status,
      },
    );
  }
}
