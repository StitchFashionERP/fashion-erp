import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} ontbreekt.`);
  }

  return value;
}

function asText(value) {
  return String(value ?? "").trim();
}

async function findLatestBackup() {
  const directory =
    ".stitch-backups/ai-studio-reset";

  const files = await fs.readdir(directory);

  const backups = files
    .filter((file) =>
      file.startsWith("ai-studio-reset-"),
    )
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  if (backups.length === 0) {
    throw new Error(
      "Geen AI Studio-back-up gevonden.",
    );
  }

  return path.join(directory, backups[0]);
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();

const serviceRoleKey = requiredEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
);

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL of SUPABASE_URL ontbreekt.",
  );
}

const confirmReset =
  process.env.CONFIRM_AI_STUDIO_RESET ===
  "VERWIJDER_AI_STUDIO_DATA";

const backupPath = await findLatestBackup();

const backup = JSON.parse(
  await fs.readFile(backupPath, "utf8"),
);

const jobs = Array.isArray(backup.jobs)
  ? backup.jobs
  : [];

const assets = Array.isArray(backup.aiAssets)
  ? backup.aiAssets
  : [];

const links = Array.isArray(backup.aiLinks)
  ? backup.aiLinks
  : [];

const organizationId = asText(
  backup.organizationId,
);

if (!organizationId) {
  throw new Error(
    "De back-up bevat geen organizationId. Reset afgebroken.",
  );
}

const jobIds = [
  ...new Set(
    jobs.map((item) => asText(item.id)).filter(Boolean),
  ),
];

const assetIds = [
  ...new Set(
    assets.map((item) => asText(item.id)).filter(Boolean),
  ),
];

const linkIds = [
  ...new Set(
    links.map((item) => asText(item.id)).filter(Boolean),
  ),
];

const storageByBucket = new Map();

for (const item of [
  ...jobs.flatMap((job) => [
    {
      bucket:
        asText(job.source_bucket) ||
        "ai-studio",
      storagePath: asText(job.source_path),
    },
    {
      bucket:
        asText(job.processed_source_bucket) ||
        "ai-studio",
      storagePath: asText(
        job.processed_source_path,
      ),
    },
    {
      bucket:
        asText(job.result_bucket) ||
        "ai-studio",
      storagePath: asText(job.result_path),
    },
    {
      bucket:
        asText(job.output_bucket) ||
        "ai-studio",
      storagePath: asText(job.output_path),
    },
  ]),
  ...assets.map((asset) => ({
    bucket: asText(asset.storage_bucket),
    storagePath: asText(asset.storage_path),
  })),
]) {
  if (!item.bucket || !item.storagePath) {
    continue;
  }

  const current =
    storageByBucket.get(item.bucket) ?? [];

  current.push(item.storagePath);

  storageByBucket.set(
    item.bucket,
    [...new Set(current)],
  );
}

console.log("");
console.log("========================================");
console.log("AI STUDIO RESET");
console.log("========================================");
console.log(`Back-up: ${backupPath}`);
console.log(`Organisatie: ${organizationId}`);
console.log(`AI-jobs: ${jobIds.length}`);
console.log(`Media-assets: ${assetIds.length}`);
console.log(`Media-links: ${linkIds.length}`);

let storageCount = 0;

for (const [bucket, paths] of storageByBucket) {
  storageCount += paths.length;
  console.log(
    `Storage ${bucket}: ${paths.length} bestanden`,
  );
}

console.log(
  `Totaal Storage-bestanden: ${storageCount}`,
);

if (!confirmReset) {
  console.log("");
  console.log("✅ DRY-RUN: niets verwijderd.");
  console.log("");
  console.log(
    "Voer pas na controle uit met:",
  );
  console.log(
    "CONFIRM_AI_STUDIO_RESET=VERWIJDER_AI_STUDIO_DATA node scripts/reset-ai-studio-media.mjs",
  );
  process.exit(0);
}

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

async function deleteInChunks(
  table,
  column,
  ids,
) {
  const chunkSize = 100;

  for (
    let index = 0;
    index < ids.length;
    index += chunkSize
  ) {
    const chunk = ids.slice(
      index,
      index + chunkSize,
    );

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("organization_id", organizationId)
      .in(column, chunk);

    if (error) {
      throw new Error(
        `${table} verwijderen mislukt: ${error.message}`,
      );
    }
  }
}

for (const [bucket, paths] of storageByBucket) {
  const chunkSize = 100;

  for (
    let index = 0;
    index < paths.length;
    index += chunkSize
  ) {
    const chunk = paths.slice(
      index,
      index + chunkSize,
    );

    const { error } = await supabase.storage
      .from(bucket)
      .remove(chunk);

    if (error) {
      throw new Error(
        `Bestanden uit ${bucket} verwijderen mislukt: ${error.message}`,
      );
    }
  }
}

if (linkIds.length > 0) {
  await deleteInChunks(
    "media_asset_links",
    "id",
    linkIds,
  );
}

if (assetIds.length > 0) {
  await deleteInChunks(
    "media_assets",
    "id",
    assetIds,
  );
}

if (jobIds.length > 0) {
  await deleteInChunks(
    "ai_studio_jobs",
    "id",
    jobIds,
  );
}

console.log("");
console.log("✅ AI Studio-data verwijderd.");
console.log("✅ Artikelen en overige ERP-data behouden.");
