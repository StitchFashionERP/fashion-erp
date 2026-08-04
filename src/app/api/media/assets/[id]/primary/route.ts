import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function asString(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const assetId = asString(id);

    const body = (await request.json()) as {
      productId?: string;
      role?: string;
    };

    const productId = asString(body.productId);
    const role = asString(body.role) || "PACKSHOT";

    if (!assetId || !productId) {
      return NextResponse.json(
        { error: "Asset-ID of artikel-ID ontbreekt." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Log opnieuw in." },
        { status: 401 },
      );
    }

    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true);

    const organizationId = asString(
      memberships?.[0]?.organization_id,
    );

    if (!organizationId) {
      return NextResponse.json(
        { error: "Geen actieve organisatie gevonden." },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();

    const { error: clearError } = await supabase
      .from("media_asset_links")
      .update({
        is_primary: false,
        updated_at: now,
      })
      .eq("organization_id", organizationId)
      .eq("entity_type", "PRODUCT")
      .eq("entity_id", productId)
      .eq("role", role);

    if (clearError) {
      throw new Error(clearError.message);
    }

    const { data: link, error: updateError } =
      await supabase
        .from("media_asset_links")
        .update({
          is_primary: true,
          updated_at: now,
        })
        .eq("organization_id", organizationId)
        .eq("asset_id", assetId)
        .eq("entity_type", "PRODUCT")
        .eq("entity_id", productId)
        .select("id")
        .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!link) {
      return NextResponse.json(
        { error: "De afbeelding is niet aan dit artikel gekoppeld." },
        { status: 404 },
      );
    }

    await supabase
      .from("media_assets")
      .update({
        is_primary: false,
        updated_at: now,
      })
      .eq("organization_id", organizationId);

    await supabase
      .from("media_assets")
      .update({
        is_primary: true,
        updated_at: now,
      })
      .eq("organization_id", organizationId)
      .eq("id", assetId);

    return NextResponse.json({
      assetId,
      productId,
      isPrimary: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Hoofdafbeelding wijzigen is mislukt.",
      },
      { status: 500 },
    );
  }
}
