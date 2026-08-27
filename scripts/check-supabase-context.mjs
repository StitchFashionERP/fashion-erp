import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(".env.local", "utf8");

for (const line of envFile.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);

  if (match) {
    process.env[match[1].trim()] =
      match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

for (const table of [
  "organizations",
  "shared_application_state",
  "product_variants",
  "products",
]) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .limit(3);

  console.log("\nTABLE:", table);

  if (error) {
    console.log("ERROR:", error.message);
  } else {
    console.log("ROWS:", data?.length);
  }
}
