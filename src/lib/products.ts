import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";

export async function getProducts() {
  const supabase = await createClient();
  const organization = await getCurrentOrganization();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createProduct(input: {
  code: string;
  name: string;
  collection?: string;
  category?: string;
  supplier?: string;
  status?: string;
  purchasePrice?: number;
  wholesalePrice?: number;
}) {
  const supabase = await createClient();
  const organization = await getCurrentOrganization();

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: organization.id,
      code: input.code,
      name: input.name,
      collection: input.collection ?? null,
      category: input.category ?? null,
      supplier: input.supplier ?? null,
      status: input.status ?? "Concept",
      purchase_price: input.purchasePrice ?? 0,
      wholesale_price: input.wholesalePrice ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const organization = await getCurrentOrganization();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    throw new Error(error.message);
  }
}