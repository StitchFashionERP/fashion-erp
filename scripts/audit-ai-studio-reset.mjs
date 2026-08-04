import fs from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function env(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} ontbreekt. Voer dit script uit met de waarden uit .env.local.`,
    );
  }

  return value;
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL of SUPABASE_URL ontbreekt.",
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY ontbreekt.",
  );
}

const organizationId =
  process.env.STITCH_ORGANIZATION_ID?.trim() || "";

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

async function readTable(table, columns = "*") {
  let query = supabase.from(table).select(columns);

  if (organizationId) {
    query = query.eq(
      "organization_id",
      organizationId,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `${table} kon niet worden gelezen: ${error.message}`,
    );
  }

  return data ?? [];
}

function text(value) {
  return String(value ?? "").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const jobs = await readTable("ai_studio_jobs");
const allAssets = await readTable("media_assets");
const allLinks = await readTable("media_asset_links");

const jobIds = new Set(
  jobs.map((job) => text(job.id)).filter(Boolean),
);

const productIds = new Set(
  jobs
    .map((job) =>
      text(
        job.product_id ??
          job.article_id ??
          job.entity_id,
      ),
    )
    .filter(Boolean),
);

const explicitAssetIds = new Set(
  jobs
    .flatMap((job) => [
      text(job.media_asset_id),
      text(job.asset_id),
      text(job.approved_asset_id),
      text(job.result_asset_id),
    ])
    .filter(Boolean),
);

const aiAssets = allAssets.filter((asset) => {
  const id = text(asset.id);
  const sourceType = text(
    asset.source_type ??
      asset.origin ??
      asset.asset_source,
  ).toUpperCase();
  const metadata =
    asset.metadata &&
    typeof asset.metadata === "object"
      ? asset.metadata
      : {};
  const metadataJobId = text(
    metadata.aiStudioJobId ??
      metadata.ai_studio_job_id ??
      metadata.jobId ??
      metadata.job_id,
  );
  const storagePath = text(asset.storage_path);

  return (
    explicitAssetIds.has(id) ||
    sourceType.includes("AI") ||
    jobIds.has(metadataJobId) ||
    storagePath.includes("/ai-studio/") ||
    storagePath.includes("/generated/") ||
    storagePath.includes("/results/")
  );
});

const aiAssetIds = new Set(
  aiAssets
    .map((asset) => text(asset.id))
    .filter(Boolean),
);

const aiLinks = allLinks.filter((link) => {
  const assetId = text(link.asset_id);
  const entityId = text(link.entity_id);

  return (
    aiAssetIds.has(assetId) ||
    (
      text(link.entity_type).toUpperCase() ===
        "PRODUCT" &&
      productIds.has(entityId) &&
      explicitAssetIds.has(assetId)
    )
  );
});

const storageObjects = unique([
  ...jobs.flatMap((job) => [
    text(job.source_path),
    text(job.processed_source_path),
    text(job.result_path),
    text(job.output_path),
  ]),
  ...aiAssets.map((asset) =>
    text(asset.storage_path),
  ),
]);

const buckets = unique([
  ...jobs.flatMap((job) => [
    text(job.source_bucket),
    text(job.processed_source_bucket),
    text(job.result_bucket),
    text(job.output_bucket),
  ]),
  ...aiAssets.map((asset) =>
    text(asset.storage_bucket),
  ),
]);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const directory =
  ".stitch-backups/ai-studio-reset";

const backup = {
  createdAt: new Date().toISOString(),
  organizationId:
    organizationId || null,
  counts: {
    jobs: jobs.length,
    aiAssets: aiAssets.length,
    aiLinks: aiLinks.length,
    storageObjects: storageObjects.length,
  },
  jobs,
  aiAssets,
  aiLinks,
  storageObjects,
  buckets,
};

const backupPath =
  `${directory}/ai-studio-reset-${timestamp}.json`;

await fs.writeFile(
  backupPath,
  JSON.stringify(backup, null, 2),
  "utf8",
);

console.log("");
console.log("========================================");
console.log("AI STUDIO RESET — LIVE INVENTARISATIE");
console.log("========================================");
console.log(`Organisatie: ${organizationId || "alle organisaties"}`);
console.log(`AI-jobs: ${jobs.length}`);
console.log(`AI-media-assets: ${aiAssets.length}`);
console.log(`AI-media-links: ${aiLinks.length}`);
console.log(`Storage-objecten: ${storageObjects.length}`);
console.log("");
console.log("Buckets:");
for (const bucket of buckets) {
  console.log(`- ${bucket}`);
}
console.log("");
console.log("Storage-paden:");
for (const path of storageObjects) {
  console.log(`- ${path}`);
}
console.log("");
console.log(`Back-up: ${backupPath}`);
console.log("");
console.log("✅ Er is nog niets verwijderd.");
