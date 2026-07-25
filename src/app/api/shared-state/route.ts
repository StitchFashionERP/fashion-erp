import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentOrganization,
  requireUser,
} from "@/lib/auth/current-context";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StateMutation = {
  key?: unknown;
  value?: unknown;
};

function isValidKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 200
  );
}

export async function GET() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shared_application_state")
    .select("storage_key, storage_value, updated_at")
    .eq("organization_id", organization.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    items: (data ?? []).map((row) => ({
      key: row.storage_key,
      value: row.storage_value,
      updatedAt: row.updated_at,
    })),
  });
}

export async function PUT(request: NextRequest) {
  const user = await requireUser();
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const body = (await request.json()) as StateMutation;

  if (!isValidKey(body.key) || typeof body.value !== "string") {
    return NextResponse.json(
      { error: "Ongeldige opslagwaarde." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("shared_application_state")
    .upsert(
      {
        organization_id: organization.id,
        storage_key: body.key,
        storage_value: body.value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id,storage_key",
      },
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const body = (await request.json()) as StateMutation;

  if (!isValidKey(body.key)) {
    return NextResponse.json(
      { error: "Ongeldige opslagsleutel." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("shared_application_state")
    .delete()
    .eq("organization_id", organization.id)
    .eq("storage_key", body.key);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
