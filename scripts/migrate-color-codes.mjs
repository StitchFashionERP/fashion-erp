import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(".env.local", "utf8");

for (const line of envFile.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);

  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log(
  "SUPABASE URL geladen:",
  Boolean(supabaseUrl),
);

console.log(
  "SERVICE KEY geladen:",
  Boolean(serviceRoleKey),
);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Supabase env ontbreekt.",
  );
}

const organizationId =
  process.env.STITCH_ORGANIZATION_ID?.trim() ||
  "kurzpjozvurrgokkrkzt";

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
  let query = supabase
    .from(table)
    .select(columns);

  if (organizationId) {
    query = query.eq(
      "organization_id",
      organizationId,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `${table}: ${error.message}`,
    );
  }

  return data ?? [];
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

const sharedState = await readTable(
  "shared_application_state",
  "storage_key, storage_value",
);

const masterDataEntry = sharedState.find(
  (item) =>
    item.storage_key === "stitch-master-data-v1",
);

if (!masterDataEntry?.storage_value) {
  console.log(
    "Aantal shared state records:",
    sharedState.length,
  );

  console.log(
    "Beschikbare keys:",
    sharedState.map(
      (item) => item.storage_key,
    ),
  );

  throw new Error(
    "Master data niet gevonden.",
  );
}

const masterData =
  JSON.parse(masterDataEntry.storage_value);

const colors =
  masterData.colorFamilies ?? [];

const variants = await readTable(
  "product_variants",
);

const colorMap = new Map(
  colors.map((color) => [
    normalize(color.name),
    color,
  ]),
);

let matched = 0;
let missing = 0;

console.log(
  `Varianten gevonden: ${variants.length}`,
);
console.log("");

for (const variant of variants) {
  const colorName = normalize(
    variant.color,
  );

  const masterColor =
    colorMap.get(colorName);

  if (!masterColor) {
    missing++;

    console.log(
      `ONTBREEKT: ${variant.color}`,
    );

    continue;
  }

  matched++;

  console.log(
    `OK: ${variant.color} -> ${masterColor.code}`,
  );
}

console.log("");
console.log(
  `Gematcht: ${matched}`,
);
console.log(
  `Ontbrekend: ${missing}`,
);
