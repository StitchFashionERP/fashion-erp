import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryProductImages } from "@/lib/media/server/product-media-service";

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
    throw new ApiError("Log opnieuw in.", 401);
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
    .map((item) =>
      asString(item.organization_id),
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

  const preferredId = asString(
    preference?.active_organization_id,
  );

  return {
    supabase,
    organizationId: organizationIds.includes(
      preferredId,
    )
      ? preferredId
      : organizationIds[0],
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as
      | { productIds?: unknown }
      | null;

    const productIds = Array.isArray(
      body?.productIds,
    )
      ? [
          ...new Set(
            body.productIds
              .map(asString)
              .filter(Boolean),
          ),
        ]
      : [];

    if (productIds.length === 0) {
      return NextResponse.json({});
    }

    const { supabase, organizationId } =
      await getContext();

    const result =
      await getPrimaryProductImages({
        supabase,
        organizationId,
        productIds,
      });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Hoofdafbeeldingen konden niet worden geladen.",
      },
      {
        status:
          error instanceof ApiError
            ? error.status
            : 500,
      },
    );
  }
}
