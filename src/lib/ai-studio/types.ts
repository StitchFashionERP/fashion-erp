export type AiStudioJobType =
  | "PRODUCT_SHOT"
  | "MODEL_SHOT"
  | "SOURCE_ENHANCEMENT";

export type AiStudioJobStatus =
  | "CONCEPT"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type AiStudioReferenceCategory =
  | "PACKSHOT"
  | "MODEL"
  | "LIFESTYLE"
  | "CAMPAIGN";

export type AiStudioJob = {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  type: AiStudioJobType;
  status: AiStudioJobStatus;
  createdAt: string;
  sourceImageUrl?: string;
  resultImageUrl?: string;
  presetName: string;
};

export type AiStudioReference = {
  id: string;
  name: string;
  category: AiStudioReferenceCategory;
  season: string;
  tags: string[];
  imageUrl?: string;
};

export type AiStudioLibraryItem = {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  type: AiStudioJobType;
  createdAt: string;
  imageUrl?: string;
};
