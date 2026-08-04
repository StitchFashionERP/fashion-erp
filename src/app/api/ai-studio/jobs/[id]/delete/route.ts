import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type DatabaseRow = Record<string, unknown>;

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

function collectStorageObjects(row: DatabaseRow) {
  const candidates = [
    {
      bucket:
        asString(row.source_bucket) ||
        "ai-studio",
      path: asString(row.source_path),
    },
    {
      bucket:
        asString(row.processed_source_bucket) ||
        "ai-studio",
      path: asString(
        row.processed_source_path,
      ),
    },
    {
      bucket:
        asString(row.result_bucket) ||
        "ai-studio",
      path: asString(row.result_path),
    },
    {
      bucket:
        asString(row.output_bucket) ||
        "ai-studio",
      path: asString(row.output_path),
    },
  ];

  const unique = new Map<
    string,
    { bucket: string; path: string }
  >();

  for (const candidate of candidates) {
    if (!candidate.bucket || !candidate.path) {
      continue;
    }

    unique.set(
      `${candidate.bucket}::${candidate.path}`,
      candidate,
    );
  }

  return [...unique.values()];
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const jobId = asString(id);

    if (!jobId) {
      throw new ApiError(
        "Ongeldige AI-versie.",
      );
    }

    const { supabase, organizationId } =
      await getContext();

    const { data: job, error: jobError } =
      await supabase
        .from("ai_studio_jobs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", jobId)
        .maybeSingle();

    if (jobError) {
      throw new ApiError(
        jobError.message,
        500,
      );
    }

    if (!job) {
      throw new ApiError(
        "De afbeelding is niet meer aanwezig.",
        404,
      );
    }

    const row =
      job as unknown as DatabaseRow;

    for (const object of collectStorageObjects(
      row,
    )) {
      const { error } = await supabase.storage
        .from(object.bucket)
        .remove([object.path]);

      if (error) {
        console.error(
          `AI-bestand verwijderen mislukt (${object.path}):`,
          error.message,
        );
      }
    }

    const { error: deleteError } =
      await supabase
        .from("ai_studio_jobs")
        .delete()
        .eq("organization_id", organizationId)
        .eq("id", jobId);

    if (deleteError) {
      throw new ApiError(
        deleteError.message,
        500,
      );
    }

    return NextResponse.json({
      deleted: true,
      type: "AI_JOB",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
