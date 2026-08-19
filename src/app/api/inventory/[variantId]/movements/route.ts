import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      variantId: string;
    }>;
  },
) {
  const { variantId } =
    await context.params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Geen gebruiker." },
      { status: 401 },
    );
  }

  const { data, error } =
    await supabase
      .from("inventory_movements")
      .select(`
        id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        created_at
      `)
      .eq(
        "variant_id",
        variantId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json(
    data ?? [],
  );
}
