import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function asString(value: unknown) {
  return String(value ?? "").trim();
}

async function getContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiError(
      "Je sessie is verlopen. Log opnieuw in.",
      401,
    );
  }

  const { data: memberships, error } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  const organizationIds = (memberships ?? [])
    .map((membership) =>
      asString(membership.organization_id),
    )
    .filter(Boolean);

  if (organizationIds.length === 0) {
    throw new ApiError(
      "Geen actieve organisatie gevonden.",
      403,
    );
  }

  const { data: preference } = await supabase
    .from("user_preferences")
    .select("active_organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const preferredOrganizationId = asString(
    preference?.active_organization_id,
  );

  return {
    supabase,
    organizationId: organizationIds.includes(
      preferredOrganizationId,
    )
      ? preferredOrganizationId
      : organizationIds[0],
  };
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "De afbeelding kon niet worden verwijderd.",
    },
    {
      status:
        error instanceof ApiError
          ? error.status
          : 500,
    },
  );
}

async function ensurePrimaryImages(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  organizationId: string,
  productIds: string[],
) {
  for (const productId of [
    ...new Set(productIds.filter(Boolean)),
  ]) {
    const { data: currentPrimary } =
      await supabase
        .from("media_asset_links")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("entity_type", "PRODUCT")
        .eq("entity_id", productId)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();

    if (currentPrimary) {
      continue;
    }

    const { data: replacement, error } =
      await supabase
        .from("media_asset_links")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("entity_type", "PRODUCT")
        .eq("entity_id", productId)
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw new ApiError(
        error.message,
        500,
      );
    }

    if (!replacement) {
      continue;
    }

    const { error: updateError } =
      await supabase
        .from("media_asset_links")
        .update({
          is_primary: true,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId)
        .eq("id", replacement.id);

    if (updateError) {
      throw new ApiError(
        updateError.message,
        500,
      );
    }
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const assetId = asString(id);

    const url = new URL(request.url);
    const mode =
      url.searchParams.get("mode") ?? "delete";
    const productId = asString(
      url.searchParams.get("productId"),
    );

    if (!assetId) {
      throw new ApiError(
        "Ongeldige afbeelding.",
      );
    }

    const { supabase, organizationId } =
      await getContext();

    if (mode === "unlink") {
      if (!productId) {
        throw new ApiError(
          "Artikel-ID ontbreekt.",
        );
      }

      const { error } = await supabase
        .from("media_asset_links")
        .delete()
        .eq("organization_id", organizationId)
        .eq("asset_id", assetId)
        .eq("entity_type", "PRODUCT")
        .eq("entity_id", productId);

      if (error) {
        throw new ApiError(
          error.message,
          500,
        );
      }

      await ensurePrimaryImages(
        supabase,
        organizationId,
        [productId],
      );

      return NextResponse.json({
        unlinked: true,
        deleted: false,
      });
    }

    if (mode !== "delete") {
      throw new ApiError(
        "Onbekende verwijderactie.",
      );
    }

    const { data: asset, error: assetError } =
      await supabase
        .from("media_assets")
        .select(
          "storage_bucket, storage_path",
        )
        .eq("organization_id", organizationId)
        .eq("id", assetId)
        .maybeSingle();

    if (assetError) {
      throw new ApiError(
        assetError.message,
        500,
      );
    }

    if (!asset) {
      throw new ApiError(
        "De afbeelding is niet meer aanwezig.",
        404,
      );
    }

    const { data: links, error: linksError } =
      await supabase
        .from("media_asset_links")
        .select(
          "entity_type, entity_id, is_primary",
        )
        .eq("organization_id", organizationId)
        .eq("asset_id", assetId);

    if (linksError) {
      throw new ApiError(
        linksError.message,
        500,
      );
    }

    const affectedProductIds = (
      links ?? []
    )
      .filter(
        (link) =>
          link.entity_type === "PRODUCT",
      )
      .map((link) =>
        asString(link.entity_id),
      )
      .filter(Boolean);

    const { error: storageError } =
      await supabase.storage
        .from(asset.storage_bucket)
        .remove([asset.storage_path]);

    if (storageError) {
      throw new ApiError(
        "Het afbeeldingsbestand kon niet worden verwijderd.",
        500,
      );
    }

    const { error: deleteError } =
      await supabase
        .from("media_assets")
        .delete()
        .eq("organization_id", organizationId)
        .eq("id", assetId);

    if (deleteError) {
      throw new ApiError(
        deleteError.message,
        500,
      );
    }

    await ensurePrimaryImages(
      supabase,
      organizationId,
      affectedProductIds,
    );

    return NextResponse.json({
      unlinked: true,
      deleted: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
