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

  const { data: membership } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .single();

  if (!membership?.organization_id) {
    return NextResponse.json(
      { error: "Geen organisatie." },
      { status: 403 },
    );
  }

  const { data, error } =
    await supabase
      .from("inventory_movements")
      .select("*")
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(20);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
