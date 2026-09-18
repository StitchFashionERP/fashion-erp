import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";

type Decision = "PRODUCE" | "DO_NOT_PRODUCE";

function getErrorMessage(cause: unknown, fallback: string) {
  if (
    cause &&
    typeof cause === "object" &&
    "message" in cause &&
    typeof cause.message === "string"
  ) {
    const details =
      "details" in cause &&
      typeof cause.details === "string" &&
      cause.details
        ? ` (${cause.details})`
        : "";

    const code =
      "code" in cause &&
      typeof cause.code === "string" &&
      cause.code
        ? ` [${cause.code}]`
        : "";

    return `${cause.message}${details}${code}`;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  return fallback;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const organization = await getCurrentOrganization();

    const { data, error } = await supabase
      .from("purchase_planning_product_decisions")
      .select("product_id, color, decision")
      .eq("organization_id", organization.id);

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((row) => ({
        productId: row.product_id,
        color: row.color ?? "",
        decision: row.decision,
      })),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Productiebeslissingen ophalen mislukt.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      productId?: string;
      color?: string;
      decision?: Decision;
    };

    if (!body.productId) {
      return NextResponse.json(
        { error: "Product ontbreekt." },
        { status: 400 },
      );
    }

    if (
      body.decision !== "PRODUCE" &&
      body.decision !== "DO_NOT_PRODUCE"
    ) {
      return NextResponse.json(
        { error: "Ongeldige productiebeslissing." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const organization = await getCurrentOrganization();

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
      .from("purchase_planning_product_decisions")
      .upsert(
        {
          organization_id: organization.id,
          product_id: body.productId,
          color: body.color ?? "",
          decision: body.decision,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
          created_by: user.id,
        },
        {
          onConflict: "organization_id,product_id,color",
        },
      )
      .select("product_id, color, decision")
      .single();

    if (error) throw error;

    return NextResponse.json({
      productId: data.product_id,
      color: data.color ?? "",
      decision: data.decision,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Productiebeslissing opslaan mislukt.",
        ),
      },
      { status: 500 },
    );
  }
}
