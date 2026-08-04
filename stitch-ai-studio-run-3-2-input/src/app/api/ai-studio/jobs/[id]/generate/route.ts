import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const AI_STUDIO_BUCKET = "ai-studio";
const OPENAI_IMAGE_ENDPOINT =
  "https://api.openai.com/v1/images/edits";

type DatabaseRow = Record<string, unknown>;

type ApiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  organizationId: string;
  userId: string;
};

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
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
      : "De packshot kon niet worden gegenereerd.";

  return NextResponse.json(
    { error: message },
    { status: 500 },
  );
}

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function isTransparentPreset(presetName: string) {
  return presetName
    .toLocaleLowerCase("nl-NL")
    .includes("transparant");
}

function createPrompt(
  presetName: string,
  articleCode: string,
  articleName: string,
  instructions: string,
) {
  const transparent = isTransparentPreset(presetName);
  const lightShadow = presetName
    .toLocaleLowerCase("nl-NL")
    .includes("schaduw");

  const backgroundInstruction = transparent
    ? lightShadow
      ? [
          "Output the garment isolated on a fully transparent background.",
          "Add only a very subtle natural studio contact shadow beneath the garment.",
          "The rest of the canvas must remain transparent.",
        ].join(" ")
      : [
          "Output the garment isolated on a fully transparent background.",
          "Do not add a floor, wall, gradient, props, border or surrounding objects.",
        ].join(" ")
    : [
        "Place the garment on a clean pure white ecommerce studio background.",
        "Use only a very subtle realistic contact shadow.",
      ].join(" ");

  return [
    "Create a premium, photorealistic ecommerce product packshot from the supplied source photo.",
    `The product is article ${articleCode}, ${articleName}.`,
    "Preserve the exact identity of the original garment.",
    "Preserve the exact color, hue, saturation, material, fabric texture, knit pattern, weave, stitching, seams, ribbing, cuffs, collar, buttons, zippers, pockets, labels, logos, prints and all other visible product details.",
    "Preserve the garment's real cut, proportions, sleeve length, body length and silhouette.",
    "Do not redesign, restyle, simplify, embellish or invent any product detail.",
    "Remove the original background, hands, hangers, clips, supports, furniture and unrelated objects.",
    "Present one garment only, centered, front-facing, upright and neatly arranged.",
    "Correct only minor perspective distortion, uneven lighting and small accidental wrinkles.",
    "Keep realistic fabric depth and natural construction; do not make the garment look plastic, illustrated or computer-generated.",
    "Use balanced professional studio lighting with accurate color reproduction.",
    "Do not include text, measurements, watermarks, decorative graphics or packaging.",
    backgroundInstruction,
    instructions
      ? `Additional user instruction: ${instructions}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
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

async function createSignedUrl(
  supabase: ApiContext["supabase"],
  path: string | null,
) {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(AI_STUDIO_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

async function markJobFailed(
  supabase: ApiContext["supabase"],
  organizationId: string,
  jobId: string,
  message: string,
) {
  await supabase
    .from("ai_studio_jobs")
    .update({
      status: "FAILED",
      error_message: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", jobId);
}

function getSourceFileName(row: DatabaseRow) {
  const storedName = asString(row.source_file_name);

  if (storedName) {
    return storedName;
  }

  const sourcePath = asString(row.source_path);
  const pathName = sourcePath.split("/").pop();

  return pathName || "source-image.png";
}

function getSourceMimeType(row: DatabaseRow) {
  return asString(row.source_mime_type) || "image/png";
}

function validateSourceMimeType(mimeType: string) {
  const supported = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

  if (!supported.has(mimeType)) {
    throw new ApiError(
      "Deze bronfoto is opgeslagen, maar kan nog niet door de AI worden verwerkt. Gebruik voor Run 3 een JPG-, PNG- of WebP-bestand. Automatische HEIC-conversie voegen we later toe.",
    );
  }
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  let jobId = "";
  let organizationId = "";
  let resultPath: string | null = null;

  try {
    const params = await context.params;
    jobId = asString(params.id);

    if (!jobId) {
      throw new ApiError("Ongeldige AI Studio-job.");
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new ApiError(
        "OPENAI_API_KEY ontbreekt in de omgevingsvariabelen.",
        503,
      );
    }

    const apiContext = await getApiContext();
    const { supabase, userId } = apiContext;
    organizationId = apiContext.organizationId;

    const { data: job, error: jobError } = await supabase
      .from("ai_studio_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      throw new ApiError(jobError.message, 500);
    }

    if (!job) {
      throw new ApiError(
        "De AI Studio-job is niet gevonden.",
        404,
      );
    }

    const row = job as unknown as DatabaseRow;
    const sourcePath = asString(row.source_path);

    if (!sourcePath) {
      throw new ApiError(
        "Bij deze AI Studio-job ontbreekt een bronfoto.",
      );
    }

    const sourceMimeType = getSourceMimeType(row);
    validateSourceMimeType(sourceMimeType);

    const presetName =
      asString(row.preset_name) ||
      "Transparante achtergrond";
    const articleCode = asString(row.article_code);
    const articleName = asString(row.article_name);
    const instructions = asString(row.instructions);

    const configuredModel =
      process.env.OPENAI_IMAGE_MODEL?.trim() ||
      "gpt-image-1.5";

    const transparent =
      isTransparentPreset(presetName);

    const model =
      transparent && configuredModel === "gpt-image-2"
        ? "gpt-image-1.5"
        : configuredModel;

    const prompt = createPrompt(
      presetName,
      articleCode,
      articleName,
      instructions,
    );

    const startedAt = new Date().toISOString();

    const { error: processingError } = await supabase
      .from("ai_studio_jobs")
      .update({
        status: "PROCESSING",
        provider: "openai",
        model,
        generation_prompt: prompt,
        generation_started_at: startedAt,
        completed_at: null,
        error_message: null,
        updated_at: startedAt,
      })
      .eq("organization_id", organizationId)
      .eq("id", jobId);

    if (processingError) {
      throw new ApiError(
        processingError.message,
        500,
      );
    }

    const { data: sourceBlob, error: downloadError } =
      await supabase.storage
        .from(AI_STUDIO_BUCKET)
        .download(sourcePath);

    if (downloadError || !sourceBlob) {
      throw new ApiError(
        `Bronfoto ophalen is mislukt: ${
          downloadError?.message ?? "onbekende fout"
        }`,
        500,
      );
    }

    const sourceFileName = getSourceFileName(row);
    const sourceBytes = await sourceBlob.arrayBuffer();

    const openAiForm = new FormData();
    openAiForm.set("model", model);
    openAiForm.append(
      "image[]",
      new File([sourceBytes], sourceFileName, {
        type: sourceMimeType,
      }),
    );
    openAiForm.set("prompt", prompt);
    openAiForm.set("size", "1024x1024");
    openAiForm.set("quality", "medium");
    openAiForm.set("output_format", "png");
    openAiForm.set(
      "background",
      transparent ? "transparent" : "opaque",
    );

    if (model !== "gpt-image-2") {
      openAiForm.set("input_fidelity", "high");
    }

    const openAiResponse = await fetch(
      OPENAI_IMAGE_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: openAiForm,
        signal: AbortSignal.timeout(170_000),
      },
    );

    const openAiRequestId =
      openAiResponse.headers.get("x-request-id");

    const openAiBody = (await openAiResponse
      .json()
      .catch(() => null)) as OpenAiImageResponse | null;

    if (!openAiResponse.ok) {
      const apiMessage =
        openAiBody?.error?.message ||
        "OpenAI kon de afbeelding niet genereren.";

      const message = openAiRequestId
        ? `${apiMessage} Request-ID: ${openAiRequestId}`
        : apiMessage;

      throw new ApiError(message, openAiResponse.status);
    }

    const imageBase64 =
      openAiBody?.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new ApiError(
        "OpenAI heeft geen afbeeldingsresultaat teruggestuurd.",
        502,
      );
    }

    const imageBuffer = Buffer.from(
      imageBase64,
      "base64",
    );

    if (imageBuffer.length === 0) {
      throw new ApiError(
        "Het gegenereerde afbeeldingsbestand is leeg.",
        502,
      );
    }

    resultPath = [
      organizationId,
      "results",
      jobId,
      "packshot.png",
    ].join("/");

    const { error: resultUploadError } =
      await supabase.storage
        .from(AI_STUDIO_BUCKET)
        .upload(resultPath, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

    if (resultUploadError) {
      throw new ApiError(
        `Het AI-resultaat kon niet worden opgeslagen: ${resultUploadError.message}`,
        500,
      );
    }

    const completedAt = new Date().toISOString();

    const { data: completedJob, error: updateError } =
      await supabase
        .from("ai_studio_jobs")
        .update({
          status: "COMPLETED",
          result_bucket: AI_STUDIO_BUCKET,
          result_path: resultPath,
          provider: "openai",
          model,
          completed_at: completedAt,
          error_message: null,
          updated_at: completedAt,
        })
        .eq("organization_id", organizationId)
        .eq("id", jobId)
        .select("*")
        .single();

    if (updateError || !completedJob) {
      throw new ApiError(
        updateError?.message ||
          "De voltooide AI-job kon niet worden bijgewerkt.",
        500,
      );
    }

    const sourceUrl = await createSignedUrl(
      supabase,
      sourcePath,
    );

    const resultUrl = await createSignedUrl(
      supabase,
      resultPath,
    );

    return NextResponse.json({
      id: jobId,
      articleId: asString(completedJob.article_id),
      articleCode: asString(
        completedJob.article_code,
      ),
      articleName: asString(
        completedJob.article_name,
      ),
      type: asString(completedJob.job_type),
      status: asString(completedJob.status),
      presetName: asString(
        completedJob.preset_name,
      ),
      provider: asString(completedJob.provider),
      model: asString(completedJob.model),
      sourceUrl,
      resultUrl,
      resultPath,
      completedAt,
      updatedBy: userId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "De packshot kon niet worden gegenereerd.";

    if (jobId && organizationId) {
      try {
        const supabase = await createClient();

        await markJobFailed(
          supabase,
          organizationId,
          jobId,
          message,
        );
      } catch {
        // De oorspronkelijke fout blijft leidend.
      }
    }

    return errorResponse(error);
  }
}
