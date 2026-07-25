import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";
import { createClient } from "@/lib/supabase/server";
import {
  mapSupplierRow,
  supplierInputToRow,
  validateSupplierInput,
  type SupplierInput,
} from "@/lib/supplier-cloud";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = (await request.json()) as SupplierInput;
    validateSupplierInput(input);

    const supabase = await createClient();
    const organization = await getCurrentOrganization();
    const { data, error } = await supabase
      .from("suppliers")
      .update(supplierInputToRow(input))
      .eq("id", id)
      .eq("organization_id", organization.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(mapSupplierRow(data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Leverancier bijwerken is mislukt." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const organization = await getCurrentOrganization();
    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", id)
      .eq("organization_id", organization.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Leverancier verwijderen is mislukt." },
      { status: 400 },
    );
  }
}
