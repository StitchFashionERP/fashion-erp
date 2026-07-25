import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getApiContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiError("Je sessie is verlopen. Log opnieuw in.", 401);
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
      String(membership.organization_id ?? ""),
    )
    .filter(Boolean);

  if (organizationIds.length === 0) {
    throw new ApiError(
      "Er is geen actieve organisatie aan dit account gekoppeld.",
      403,
    );
  }

  const { data: preferences, error: preferenceError } =
    await supabase
      .from("user_preferences")
      .select("active_organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (preferenceError) {
    throw new ApiError(preferenceError.message, 500);
  }

  const preferredOrganizationId = String(
    preferences?.active_organization_id ?? "",
  );

  const organizationId = organizationIds.includes(
    preferredOrganizationId,
  )
    ? preferredOrganizationId
    : organizationIds[0];

  return { organizationId, supabase };
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
          : "De klantbewerking is mislukt.",
    },
    { status: 500 },
  );
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const customerId = decodeURIComponent(id);
    const { organizationId, supabase } = await getApiContext();

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("organization_id", organizationId)
      .or(`legacy_id.eq.${customerId},id.eq.${customerId}`);

    if (error) {
      throw new ApiError(error.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
