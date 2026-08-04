import type {
  MediaAssetCategory,
  MediaAssetKind,
  MediaAssetStatus,
  MediaOrigin,
} from "@/lib/media/types";

export const MEDIA_STORAGE_BUCKET = "media-center";

export const MEDIA_ASSET_KINDS: readonly MediaAssetKind[] = [
  "IMAGE",
  "VIDEO",
  "DOCUMENT",
  "AUDIO",
  "OTHER",
];

export const MEDIA_ASSET_CATEGORIES: readonly MediaAssetCategory[] = [
  "SOURCE",
  "PACKSHOT",
  "DETAIL",
  "MODEL",
  "LIFESTYLE",
  "CAMPAIGN",
  "SOCIAL",
  "REFERENCE",
  "DOCUMENT",
  "OTHER",
];

export const MEDIA_ASSET_STATUSES: readonly MediaAssetStatus[] = [
  "CONCEPT",
  "APPROVED",
  "ARCHIVED",
];

export const MEDIA_ORIGINS: readonly MediaOrigin[] = [
  "UPLOAD",
  "AI",
  "IMPORT",
  "EXTERNAL",
];

export const MEDIA_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const MEDIA_MAX_IMAGE_FILE_SIZE =
  25 * 1024 * 1024;
