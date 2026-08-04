import type {
  AiStudioJob,
  AiStudioLibraryItem,
  AiStudioReference,
} from "@/lib/ai-studio/types";

export const aiStudioDemoJobs: AiStudioJob[] = [
  {
    id: "ai-job-1004",
    articleId: "demo-article-1004",
    articleCode: "KN-1004",
    articleName: "Merino Crewneck",
    type: "PRODUCT_SHOT",
    status: "COMPLETED",
    createdAt: "2026-08-03T18:30:00.000Z",
    presetName: "Studio transparant",
  },
  {
    id: "ai-job-1003",
    articleId: "demo-article-1003",
    articleCode: "HD-1003",
    articleName: "Heavy Hoodie",
    type: "MODEL_SHOT",
    status: "PROCESSING",
    createdAt: "2026-08-03T17:42:00.000Z",
    presetName: "Heren studio neutraal",
  },
  {
    id: "ai-job-1002",
    articleId: "demo-article-1002",
    articleCode: "TS-1002",
    articleName: "Relaxed Tee",
    type: "SOURCE_ENHANCEMENT",
    status: "QUEUED",
    createdAt: "2026-08-03T16:05:00.000Z",
    presetName: "Bronfoto optimaliseren",
  },
  {
    id: "ai-job-1001",
    articleId: "demo-article-1001",
    articleCode: "SW-1001",
    articleName: "Essential Sweat",
    type: "PRODUCT_SHOT",
    status: "FAILED",
    createdAt: "2026-08-03T14:15:00.000Z",
    presetName: "Studio transparant",
  },
];

export const aiStudioDemoReferences: AiStudioReference[] = [
  {
    id: "reference-1",
    name: "Transparante packshot",
    category: "PACKSHOT",
    season: "Doorlopend",
    tags: ["transparant", "webshop", "neutraal"],
  },
  {
    id: "reference-2",
    name: "Lichte studioschaduw",
    category: "PACKSHOT",
    season: "Doorlopend",
    tags: ["schaduw", "studio", "premium"],
  },
  {
    id: "reference-3",
    name: "Heren studio FW26",
    category: "MODEL",
    season: "FW26",
    tags: ["heren", "studio", "winter"],
  },
  {
    id: "reference-4",
    name: "Dames lifestyle SS27",
    category: "LIFESTYLE",
    season: "SS27",
    tags: ["dames", "lifestyle", "zomer"],
  },
];

export const aiStudioDemoLibrary: AiStudioLibraryItem[] = [
  {
    id: "library-1",
    articleId: "demo-article-1004",
    articleCode: "KN-1004",
    articleName: "Merino Crewneck",
    type: "PRODUCT_SHOT",
    createdAt: "2026-08-03T18:36:00.000Z",
  },
  {
    id: "library-2",
    articleId: "demo-article-1003",
    articleCode: "HD-1003",
    articleName: "Heavy Hoodie",
    type: "MODEL_SHOT",
    createdAt: "2026-08-02T14:18:00.000Z",
  },
];
