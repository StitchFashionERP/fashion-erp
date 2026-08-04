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
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError("Log opnieuw in.", 401);
  }

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) {
    throw new ApiError(error.message, 500);
  }

  const organizationId = asString(
    memberships?.[0]?.organization_id,
  );

  if (!organizationId) {
    throw new ApiError(
      "Geen actieve organisatie gevonden.",
      403,
    );
  }

  return { supabase, organizationId };
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Verwijderen is mislukt.",
    },
    {
      status:
        error instanceof ApiError ? error.status : 500,
    },
  );
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
      throw new ApiError("Ongeldige afbeelding.");
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
        throw new ApiError(error.message, 500);
      }

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
        .select("storage_bucket, storage_path")
        .eq("organization_id", organizationId)
        .eq("id", assetId)
        .maybeSingle();

    if (assetError) {
      throw new ApiError(assetError.message, 500);
    }

    if (!asset) {
      throw new ApiError(
        "Afbeelding niet gevonden.",
        404,
      );
    }

    const { error: storageError } =
      await supabase.storage
        .from(asset.storage_bucket)
        .remove([asset.storage_path]);

    if (storageError) {
      throw new ApiError(
        storageError.message,
        500,
      );
    }

    const { error: deleteError } = await supabase
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

    return NextResponse.json({
      unlinked: true,
      deleted: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
