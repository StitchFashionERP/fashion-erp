export type MediaAssetKind =
  | "IMAGE"
  | "VIDEO"
  | "DOCUMENT"
  | "AUDIO"
  | "OTHER";

export type MediaAssetCategory =
  | "SOURCE"
  | "PACKSHOT"
  | "DETAIL"
  | "MODEL"
  | "LIFESTYLE"
  | "CAMPAIGN"
  | "SOCIAL"
  | "REFERENCE"
  | "DOCUMENT"
  | "OTHER";

export type MediaAssetStatus =
  | "CONCEPT"
  | "APPROVED"
  | "ARCHIVED";

export type MediaOrigin =
  | "UPLOAD"
  | "AI"
  | "IMPORT"
  | "EXTERNAL";

export type MediaEntityType =
  | "PRODUCT"
  | "CAMPAIGN"
  | "COLLECTION"
  | "SUPPLIER"
  | "CUSTOMER"
  | "ORGANIZATION";

export type MediaAsset = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  kind: MediaAssetKind;
  category: MediaAssetCategory;
  status: MediaAssetStatus;
  origin: MediaOrigin;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  versionNumber: number;
  parentAssetId: string | null;
  isPrimary: boolean;
  aiProvider: string | null;
  aiModel: string | null;
  aiPrompt: string | null;
  aiJobId: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  archivedAt: string | null;
};

export type MediaAssetLink = {
  id: string;
  organizationId: string;
  assetId: string;
  entityType: MediaEntityType;
  entityId: string;
  role: MediaAssetCategory;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MediaAssetInput = {
  name: string;
  description?: string;
  kind: MediaAssetKind;
  category: MediaAssetCategory;
  origin: MediaOrigin;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  versionNumber?: number;
  parentAssetId?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiPrompt?: string | null;
  aiJobId?: string | null;
};

export type MediaAssetLinkInput = {
  assetId: string;
  entityType: MediaEntityType;
  entityId: string;
  role: MediaAssetCategory;
  isPrimary?: boolean;
  sortOrder?: number;
};
