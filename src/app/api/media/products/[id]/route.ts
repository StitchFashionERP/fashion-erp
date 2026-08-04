import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Productmedia kon niet worden geladen.",
    },
    { status: 500 },
  );
}

async function getOrganizationContext() {
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

  const { data: memberships, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true);

  if (membershipError) {
    throw new ApiError(membershipError.message, 500);
  }

  const organizationIds = (memberships ?? [])
    .map((membership) =>
      asString(membership.organization_id),
    )
    .filter(Boolean);

  if (organizationIds.length === 0) {
    throw new ApiError(
      "Er is geen actieve organisatie gekoppeld.",
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

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;
    const productId = asString(id);

    if (!productId) {
      throw new ApiError("Ongeldig artikel-ID.");
    }

    const { supabase, organizationId } =
      await getOrganizationContext();

    const { data: links, error: linksError } =
      await supabase
        .from("media_asset_links")
        .select(
          `
          id,
          asset_id,
          role,
          is_primary,
          sort_order,
          media_assets (
            id,
            name,
            description,
            kind,
            category,
            status,
            origin,
            storage_bucket,
            storage_path,
            mime_type,
            file_size,
            width,
            height,
            version_number,
            is_primary,
            ai_provider,
            ai_model,
            ai_prompt,
            ai_job_id,
            created_at,
            updated_at,
            approved_at
          )
        `,
        )
        .eq("organization_id", organizationId)
        .eq("entity_type", "PRODUCT")
        .eq("entity_id", productId)
        .order("sort_order", { ascending: true });

    if (linksError) {
      throw new ApiError(linksError.message, 500);
    }

    const result = await Promise.all(
      (links ?? []).map(async (link) => {
        const asset = Array.isArray(link.media_assets)
          ? link.media_assets[0]
          : link.media_assets;

        if (!asset) {
          return null;
        }

        const { data: signedUrlData } =
          await supabase.storage
            .from(asset.storage_bucket)
            .createSignedUrl(
              asset.storage_path,
              60 * 60,
            );

        return {
          linkId: link.id,
          assetId: asset.id,
          productId,
          name: asset.name,
          description: asset.description,
          kind: asset.kind,
          category: asset.category,
          status: asset.status,
          origin: asset.origin,
          mimeType: asset.mime_type,
          fileSize: asset.file_size,
          width: asset.width,
          height: asset.height,
          versionNumber: asset.version_number,
          isPrimary:
            Boolean(link.is_primary) ||
            Boolean(asset.is_primary),
          role: link.role,
          sortOrder: link.sort_order,
          signedUrl: signedUrlData?.signedUrl ?? null,
          aiProvider: asset.ai_provider,
          aiModel: asset.ai_model,
          aiJobId: asset.ai_job_id,
          createdAt: asset.created_at,
          updatedAt: asset.updated_at,
          approvedAt: asset.approved_at,
        };
      }),
    );

    return NextResponse.json(
      result.filter(Boolean),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
