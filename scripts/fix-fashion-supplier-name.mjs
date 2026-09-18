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

const STALE_NAME = "Fashion";
const CORRECT_NAME = "Pullover srl";

const { data: products, error } = await supabase
  .from("products")
  .select("id, product_code, name, profile")
  .eq("profile->>supplier", STALE_NAME);

if (error) throw error;

if (products.length === 0) {
  console.log(`No products found for "${STALE_NAME}" (already fixed?)`);
}

for (const product of products) {
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

console.log("\n=== Verification: distinct supplier text values now on products ===");
const { data: all, error: allError } = await supabase
  .from("products")
  .select("profile");
if (allError) throw allError;

const { data: suppliers, error: suppliersError } = await supabase
  .from("suppliers")
  .select("company_name");
if (suppliersError) throw suppliersError;

const supplierNames = new Set(
  suppliers.map((s) => s.company_name.trim().toLowerCase()),
);

const unmatched = new Map();
for (const p of all) {
  const supplierText = String(p.profile?.supplier ?? "").trim();
  if (!supplierText) continue;
  if (!supplierNames.has(supplierText.toLowerCase())) {
    unmatched.set(supplierText, (unmatched.get(supplierText) ?? 0) + 1);
  }
}

console.log("Still unmatched supplier text values (product count):");
console.log([...unmatched.entries()]);
