import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const organization = await getCurrentOrganization();
    const supabase = await createClient();

    let query = supabase
      .from("customers")
      .delete()
      .eq("organization_id", organization.id);

    query = UUID_PATTERN.test(id) ? query.eq("id", id) : query.eq("legacy_id", id);
    const { error } = await query;

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Klant verwijderen is mislukt." },
      { status: 500 },
    );
  }
}
