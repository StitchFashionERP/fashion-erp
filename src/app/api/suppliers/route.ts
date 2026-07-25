import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";
import { createClient } from "@/lib/supabase/server";
import {
  mapSupplierRow,
  supplierInputToRow,
  validateSupplierInput,
  type SupplierInput,
} from "@/lib/supplier-cloud";

export async function GET() {
  try {
    const supabase = await createClient();
    const organization = await getCurrentOrganization();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("company_name");

    if (error) throw error;
    return NextResponse.json((data ?? []).map(mapSupplierRow));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Leveranciers ophalen is mislukt." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as SupplierInput;
    validateSupplierInput(input);

    const supabase = await createClient();
    const organization = await getCurrentOrganization();
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        organization_id: organization.id,
        ...supplierInputToRow(input),
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(mapSupplierRow(data), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Leverancier opslaan is mislukt." },
      { status: 400 },
    );
  }
}
