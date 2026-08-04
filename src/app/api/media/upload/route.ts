import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAndLinkMediaAsset } from "@/lib/media/server";
import {
  MEDIA_MAX_IMAGE_FILE_SIZE,
  MEDIA_STORAGE_BUCKET,
  type MediaAssetCategory,
} from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 120;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(fileName: string) {
  const base = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || "media";
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
          : "De afbeelding kon niet worden geüpload.",
    },
    { status: 500 },
  );
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

  return {
    supabase,
    userId: user.id,
    organizationId: organizationIds.includes(
      preferredOrganizationId,
    )
      ? preferredOrganizationId
      : organizationIds[0],
  };
}

async function prepareImage(file: File) {
  const originalBytes = Buffer.from(
    await file.arrayBuffer(),
  );

  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif";

  if (!isHeic) {
    return {
      bytes: originalBytes,
      mimeType: file.type,
      extension:
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg",
      converted: false,
    };
  }

  const imported = await import("heic-convert");
  const convert = imported.default;

  const converted = await convert({
    buffer: originalBytes,
    format: "PNG",
    quality: 1,
  });

  return {
    bytes: Buffer.from(converted),
    mimeType: "image/png",
    extension: "png",
    converted: true,
  };
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;

  try {
    const {
      supabase,
      organizationId,
      userId,
    } = await getContext();

    const formData = await request.formData();

    const productId = asString(
      formData.get("productId"),
    );

    const categoryValue =
      asString(formData.get("category")) ||
      "PACKSHOT";

    const makePrimary =
      asString(formData.get("makePrimary")) === "true";

    const fileValue = formData.get("file");

    if (!productId) {
      throw new ApiError(
        "Een artikel-ID is verplicht.",
      );
    }

    if (!(fileValue instanceof File)) {
      throw new ApiError(
        "Selecteer eerst een afbeelding.",
      );
    }

    if (!allowedMimeTypes.has(fileValue.type)) {
      throw new ApiError(
        "Gebruik een JPG-, PNG-, WebP-, HEIC- of HEIF-afbeelding.",
      );
    }

    if (
      fileValue.size === 0 ||
      fileValue.size > MEDIA_MAX_IMAGE_FILE_SIZE
    ) {
      throw new ApiError(
        "De afbeelding mag maximaal 25 MB groot zijn.",
      );
    }

    const { data: product, error: productError } =
      await supabase
        .from("products")
        .select("id, product_code, name")
        .eq("organization_id", organizationId)
        .eq("id", productId)
        .maybeSingle();

    if (productError) {
      throw new ApiError(productError.message, 500);
    }

    if (!product) {
      throw new ApiError(
        "Het geselecteerde artikel is niet gevonden.",
        404,
      );
    }

    const prepared = await prepareImage(fileValue);
    const assetId = crypto.randomUUID();

    const safeName = sanitizeFileName(
      fileValue.name,
    );

    uploadedPath = [
      organizationId,
      "products",
      productId,
      assetId,
      `${safeName}.${prepared.extension}`,
    ].join("/");

    const uploadArrayBuffer =
      prepared.bytes.buffer.slice(
        prepared.bytes.byteOffset,
        prepared.bytes.byteOffset +
          prepared.bytes.byteLength,
      ) as ArrayBuffer;

    const { error: uploadError } =
      await supabase.storage
        .from(MEDIA_STORAGE_BUCKET)
        .upload(uploadedPath, uploadArrayBuffer, {
          contentType: prepared.mimeType,
          upsert: false,
        });

    if (uploadError) {
      throw new ApiError(
        `Uploaden is mislukt: ${uploadError.message}`,
        500,
      );
    }

    const category =
      categoryValue as MediaAssetCategory;

    const { asset, link } =
      await createAndLinkMediaAsset(
        {
          supabase,
          organizationId,
          userId,
          input: {
            name: fileValue.name,
            description: prepared.converted
              ? "Automatisch geconverteerd van HEIC/HEIF naar PNG."
              : "",
            kind: "IMAGE",
            category,
            origin: "UPLOAD",
            storageBucket: MEDIA_STORAGE_BUCKET,
            storagePath: uploadedPath,
            mimeType: prepared.mimeType,
            fileSize: prepared.bytes.length,
          },
        },
        {
          entityType: "PRODUCT",
          entityId: productId,
          role: category,
          isPrimary: makePrimary,
          sortOrder: 0,
        },
      );

    const { data: signedUrlData } =
      await supabase.storage
        .from(MEDIA_STORAGE_BUCKET)
        .createSignedUrl(uploadedPath, 60 * 60);

    return NextResponse.json(
      {
        asset,
        link,
        product: {
          id: product.id,
          code: product.product_code,
          name: product.name,
        },
        signedUrl:
          signedUrlData?.signedUrl ?? null,
        convertedFromHeic: prepared.converted,
      },
      { status: 201 },
    );
  } catch (error) {
    if (uploadedPath) {
      try {
        const supabase = await createClient();

        await supabase.storage
          .from(MEDIA_STORAGE_BUCKET)
          .remove([uploadedPath]);
      } catch {
        // De oorspronkelijke fout blijft leidend.
      }
    }

    return errorResponse(error);
  }
}
