import { NextResponse } from "next/server";
import { getCurrentOrganization, requireUser } from "@/lib/auth/current-context";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CloudStorageWrite = {
  key?: unknown;
  value?: unknown;
};

function isValidStorageKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 200 &&
    value.startsWith("fashion-erp-")
  );
}

export async function GET() {
  const user = await requireUser();
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_cloud_storage")
    .select("storage_key, storage_value, updated_at")
    .eq("organization_id", organization.id)
    .order("storage_key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    organizationId: organization.id,
    userId: user.id,
    entries: (data ?? []).map((row) => ({
      key: row.storage_key,
      value: row.storage_value,
      updatedAt: row.updated_at,
    })),
  });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const body = (await request.json()) as CloudStorageWrite;

  if (!isValidStorageKey(body.key)) {
    return NextResponse.json({ error: "Ongeldige opslagcode." }, { status: 400 });
  }

  const { error } = await supabase
    .from("organization_cloud_storage")
    .upsert(
      {
        organization_id: organization.id,
        storage_key: body.key,
        storage_value: body.value ?? null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,storage_key" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await requireUser();
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!isValidStorageKey(key)) {
    return NextResponse.json({ error: "Ongeldige opslagcode." }, { status: 400 });
  }

  const { error } = await supabase
    .from("organization_cloud_storage")
    .delete()
    .eq("organization_id", organization.id)
    .eq("storage_key", key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
