import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  const body = await request.json();

  const supabase = await createClient();

  const { data: userData } =
    await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json(
      { error: "Geen gebruiker." },
      { status: 401 },
    );
  }

  const { data, error } =
    await supabase
      .from("purchase_orders")
      .update({
        status: body.status,
      })
      .eq("id", id)
      .select("*")
      .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
