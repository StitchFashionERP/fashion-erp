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

const { data: suppliers, error: suppliersError } = await supabase
  .from("suppliers")
  .select("id, company_name");
if (suppliersError) throw suppliersError;

const supplierByName = new Map(
  suppliers.map((s) => [s.company_name.trim().toLowerCase(), s]),
);

const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, product_code, profile, supplier_id");
if (productsError) throw productsError;

let updated = 0;
let alreadySet = 0;
let unmatched = 0;

for (const product of products) {
  if (product.supplier_id) {
    alreadySet += 1;
    continue;
  }

  const supplierText = String(product.profile?.supplier ?? "").trim();
  const supplier = supplierByName.get(supplierText.toLowerCase());

  if (!supplier) {
    unmatched += 1;
    console.log(
      `No supplier match for ${product.product_code}: "${supplierText}"`,
    );
    continue;
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ supplier_id: supplier.id })
    .eq("id", product.id);

  if (updateError) throw updateError;

  updated += 1;
}

console.log(
  `\nDone. Backfilled: ${updated}, already set: ${alreadySet}, unmatched: ${unmatched}, total: ${products.length}`,
);
