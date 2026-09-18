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

const CORRECT_NAME = "LUMA s.r.l";
const STALE_NAME = "Luma";

const productIds = [
  "96ea7fac-ddc8-4a6a-87a7-e2d70426d9aa",
  "10a18fce-c65e-4916-bc79-2fde29a03a19",
  "99285f25-87ae-44f6-8bb2-a9c13acb3ba2",
];

const { data: products, error } = await supabase
  .from("products")
  .select("id, product_code, name, profile")
  .in("id", productIds);

if (error) throw error;

for (const product of products) {
  if (product.profile?.supplier !== STALE_NAME) {
    throw new Error(
      `Unexpected supplier value on ${product.product_code}: ${product.profile?.supplier}`,
    );
  }

  const nextProfile = {
    ...product.profile,
    supplier: CORRECT_NAME,
  };

  const { error: updateError } = await supabase
    .from("products")
    .update({ profile: nextProfile })
    .eq("id", product.id);

  if (updateError) throw updateError;

  console.log(
    `Updated ${product.product_code} (${product.name}): "${STALE_NAME}" -> "${CORRECT_NAME}"`,
  );
}

const { data: verify, error: verifyError } = await supabase
  .from("products")
  .select("id, product_code, profile")
  .in("id", productIds);

if (verifyError) throw verifyError;

console.log("\n=== Verification ===");
for (const product of verify) {
  console.log(product.product_code, "->", product.profile.supplier);
}
