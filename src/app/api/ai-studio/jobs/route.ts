import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AI_STUDIO_BUCKET = "ai-studio";
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type DatabaseRow = Record<string, unknown>;

type ApiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  organizationId: string;
  userId: string;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "De AI Studio-opdracht kon niet worden verwerkt.";

  return NextResponse.json(
    { error: message },
    { status: 500 },
  );
}

function sanitizeFileName(fileName: string) {
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()?.toLowerCase() ?? "jpg"}`
    : "";

  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "bronfoto"}${extension}`;
}

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function mapJob(
  row: DatabaseRow,
  sourceUrl: string | null,
  resultUrl: string | null = null,
) {
  return {
    id: String(row.id ?? ""),
    organizationId: String(row.organization_id ?? ""),
    articleId: String(row.article_id ?? ""),
    articleCode: String(row.article_code ?? ""),
    articleName: String(row.article_name ?? ""),
    type: String(row.job_type ?? "PRODUCT_SHOT"),
    status: String(row.status ?? "CONCEPT"),
    presetName: String(row.preset_name ?? ""),
    instructions: String(row.instructions ?? ""),
    sourceFileName: String(row.source_file_name ?? ""),
    sourceMimeType: String(row.source_mime_type ?? ""),
    sourceFileSize: Number(row.source_file_size ?? 0),
    sourceUrl,
    resultUrl,
    resultPath: String(row.result_path ?? ""),
    provider: String(row.provider ?? ""),
    model: String(row.model ?? ""),
    errorMessage: String(row.error_message ?? ""),
    completedAt: String(row.completed_at ?? ""),
    versionNumber: Number(row.version_number ?? 1),
    assetStatus: String(row.asset_status ?? "CONCEPT"),
    isPrimary: Boolean(row.is_primary ?? false),
    approvedAt: String(row.approved_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

async function getApiContext(): Promise<ApiContext> {
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
      String(membership.organization_id ?? ""),
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

  const preferredOrganizationId = String(
    preference?.active_organization_id ?? "",
  );

  const organizationId = organizationIds.includes(
    preferredOrganizationId,
  )
    ? preferredOrganizationId
    : organizationIds[0];

  return {
    supabase,
    organizationId,
    userId: user.id,
  };
}

async function createSignedSourceUrl(
  supabase: ApiContext["supabase"],
  sourcePath: string | null,
) {
  if (!sourcePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(AI_STUDIO_BUCKET)
    .createSignedUrl(sourcePath, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export async function GET() {
  try {
    const { supabase, organizationId } =
      await getApiContext();

    const { data, error } = await supabase
      .from("ai_studio_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new ApiError(error.message, 500);
    }

    const jobs = await Promise.all(
      (data ?? []).map(async (row) => {
        const sourcePath = row.source_path
          ? String(row.source_path)
          : null;

        const resultPath = row.result_path
          ? String(row.result_path)
          : null;

        const [sourceUrl, resultUrl] =
          await Promise.all([
            createSignedSourceUrl(
              supabase,
              sourcePath,
            ),
            createSignedSourceUrl(
              supabase,
              resultPath,
            ),
          ]);

        return mapJob(
          row as unknown as DatabaseRow,
          sourceUrl,
          resultUrl,
        );
      }),
    );

    return NextResponse.json(jobs);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;

  try {
    const {
      supabase,
      organizationId,
      userId,
    } = await getApiContext();

    const formData = await request.formData();

    const articleId = asString(formData.get("articleId"));
    const presetName =
      asString(formData.get("presetName")) ||
      "Transparante achtergrond";
    const instructions = asString(
      formData.get("instructions"),
    );

    const fileValue = formData.get("sourceImage");

    if (!articleId) {
      throw new ApiError("Selecteer eerst een artikel.");
    }

    if (!(fileValue instanceof File)) {
      throw new ApiError("Selecteer eerst een bronfoto.");
    }

    if (fileValue.size === 0) {
      throw new ApiError("Het gekozen bestand is leeg.");
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      throw new ApiError(
        "De bronfoto mag maximaal 15 MB groot zijn.",
      );
    }

    if (!allowedMimeTypes.has(fileValue.type)) {
      throw new ApiError(
        "Gebruik een JPG-, PNG-, WebP-, HEIC- of HEIF-afbeelding.",
      );
    }

    const { data: article, error: articleError } =
      await supabase
        .from("products")
        .select("id, product_code, name")
        .eq("organization_id", organizationId)
        .eq("id", articleId)
        .maybeSingle();

    if (articleError) {
      throw new ApiError(articleError.message, 500);
    }

    if (!article) {
      throw new ApiError(
        "Het geselecteerde artikel bestaat niet meer.",
        404,
      );
    }

    const jobId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(fileValue.name);

    uploadedPath = [
      organizationId,
      "sources",
      jobId,
      safeFileName,
    ].join("/");

    const fileBuffer = await fileValue.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(AI_STUDIO_BUCKET)
      .upload(uploadedPath, fileBuffer, {
        contentType: fileValue.type,
        upsert: false,
      });

    if (uploadError) {
      throw new ApiError(
        `Bronfoto uploaden is mislukt: ${uploadError.message}`,
        500,
      );
    }

    const now = new Date().toISOString();

    const { data: savedJob, error: jobError } =
      await supabase
        .from("ai_studio_jobs")
        .insert({
          id: jobId,
          organization_id: organizationId,
          article_id: article.id,
          article_code: article.product_code ?? "",
          article_name: article.name ?? "",
          job_type: "PRODUCT_SHOT",
          status: "CONCEPT",
          preset_name: presetName,
          instructions,
          source_bucket: AI_STUDIO_BUCKET,
          source_path: uploadedPath,
          source_file_name: fileValue.name,
          source_mime_type: fileValue.type,
          source_file_size: fileValue.size,
          created_by: userId,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

    if (jobError || !savedJob) {
      await supabase.storage
        .from(AI_STUDIO_BUCKET)
        .remove([uploadedPath]);

      uploadedPath = null;

      throw new ApiError(
        jobError?.message ??
          "De AI Studio-opdracht kon niet worden opgeslagen.",
        500,
      );
    }

    const sourceUrl = await createSignedSourceUrl(
      supabase,
      uploadedPath,
    );

    return NextResponse.json(
      mapJob(
        savedJob as unknown as DatabaseRow,
        sourceUrl,
      ),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
