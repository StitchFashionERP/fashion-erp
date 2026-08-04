import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MediaAsset,
  MediaAssetInput,
  MediaAssetLink,
  MediaAssetLinkInput,
} from "@/lib/media";

type DatabaseRow = Record<string, unknown>;

type CreateMediaAssetOptions = {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string | null;
  input: MediaAssetInput;
};

type CreateMediaAssetLinkOptions = {
  supabase: SupabaseClient;
  organizationId: string;
  input: MediaAssetLinkInput;
};

function asString(value: unknown) {
  return String(value ?? "");
}

function asNullableString(value: unknown) {
  const normalized = asString(value).trim();
  return normalized ? normalized : null;
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function mapMediaAsset(row: DatabaseRow): MediaAsset {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    name: asString(row.name),
    description: asString(row.description),
    kind: row.kind as MediaAsset["kind"],
    category: row.category as MediaAsset["category"],
    status: row.status as MediaAsset["status"],
    origin: row.origin as MediaAsset["origin"],
    storageBucket: asString(row.storage_bucket),
    storagePath: asString(row.storage_path),
    mimeType: asString(row.mime_type),
    fileSize: Number(row.file_size ?? 0),
    width: asNullableNumber(row.width),
    height: asNullableNumber(row.height),
    versionNumber: Number(row.version_number ?? 1),
    parentAssetId: asNullableString(row.parent_asset_id),
    isPrimary: Boolean(row.is_primary),
    aiProvider: asNullableString(row.ai_provider),
    aiModel: asNullableString(row.ai_model),
    aiPrompt: asNullableString(row.ai_prompt),
    aiJobId: asNullableString(row.ai_job_id),
    createdBy: asNullableString(row.created_by),
    approvedBy: asNullableString(row.approved_by),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    approvedAt: asNullableString(row.approved_at),
    archivedAt: asNullableString(row.archived_at),
  };
}

function mapMediaAssetLink(
  row: DatabaseRow,
): MediaAssetLink {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    assetId: asString(row.asset_id),
    entityType: row.entity_type as MediaAssetLink["entityType"],
    entityId: asString(row.entity_id),
    role: row.role as MediaAssetLink["role"],
    isPrimary: Boolean(row.is_primary),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export async function createMediaAsset({
  supabase,
  organizationId,
  userId,
  input,
}: CreateMediaAssetOptions): Promise<MediaAsset> {
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description ?? "",
      kind: input.kind,
      category: input.category,
      status: "CONCEPT",
      origin: input.origin,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      width: input.width ?? null,
      height: input.height ?? null,
      version_number: input.versionNumber ?? 1,
      parent_asset_id: input.parentAssetId ?? null,
      is_primary: false,
      ai_provider: input.aiProvider ?? null,
      ai_model: input.aiModel ?? null,
      ai_prompt: input.aiPrompt ?? null,
      ai_job_id: input.aiJobId ?? null,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "Media-asset kon niet worden aangemaakt.",
    );
  }

  return mapMediaAsset(
    data as unknown as DatabaseRow,
  );
}

export async function createMediaAssetLink({
  supabase,
  organizationId,
  input,
}: CreateMediaAssetLinkOptions): Promise<MediaAssetLink> {
  if (input.isPrimary) {
    const { error: clearPrimaryError } = await supabase
      .from("media_asset_links")
      .update({
        is_primary: false,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("entity_type", input.entityType)
      .eq("entity_id", input.entityId)
      .eq("role", input.role);

    if (clearPrimaryError) {
      throw new Error(clearPrimaryError.message);
    }
  }

  const { data, error } = await supabase
    .from("media_asset_links")
    .upsert(
      {
        organization_id: organizationId,
        asset_id: input.assetId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        role: input.role,
        is_primary: input.isPrimary ?? false,
        sort_order: input.sortOrder ?? 0,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "asset_id,entity_type,entity_id,role",
      },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "Media-link kon niet worden aangemaakt.",
    );
  }

  return mapMediaAssetLink(
    data as unknown as DatabaseRow,
  );
}

export async function createAndLinkMediaAsset(
  assetOptions: CreateMediaAssetOptions,
  linkInput: Omit<MediaAssetLinkInput, "assetId">,
) {
  const asset = await createMediaAsset(assetOptions);

  try {
    const link = await createMediaAssetLink({
      supabase: assetOptions.supabase,
      organizationId: assetOptions.organizationId,
      input: {
        ...linkInput,
        assetId: asset.id,
      },
    });

    return {
      asset,
      link,
    };
  } catch (error) {
    await assetOptions.supabase
      .from("media_assets")
      .delete()
      .eq("organization_id", assetOptions.organizationId)
      .eq("id", asset.id);

    throw error;
  }
}
