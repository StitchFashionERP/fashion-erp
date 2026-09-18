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

const { data: suppliers, error } = await supabase
  .from("suppliers")
  .select("id, company_name")
  .ilike("company_name", "%luma%");

if (error) throw error;

console.log("=== Suppliers table (real records) matching 'luma' ===");
console.log(suppliers);

const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, name, product_code, profile")
  .ilike("profile->>supplier", "%luma%");

if (productsError) throw productsError;

console.log(`\n=== Products whose profile.supplier contains 'luma' (${products.length}) ===`);

for (const product of products) {
  console.log({
    id: product.id,
    code: product.product_code,
    name: product.name,
    supplier: product.profile?.supplier,
  });
}

const distinctValues = new Set(
  products.map((p) => p.profile?.supplier),
);

console.log("\n=== Distinct supplier text values found on products ===");
console.log([...distinctValues]);
