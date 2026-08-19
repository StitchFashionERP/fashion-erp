import { createClient } from "@/lib/supabase/server";

export async function getDefaultStockLocation(
  organizationId: string,
) {
  const supabase = await createClient();

  const { data, error } =
    await supabase
      .from("stock_locations")
      .select("*")
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "active",
        true,
      )
      .order(
        "name",
        {
          ascending: true,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Geen actief magazijn gevonden.",
    );
  }

  return data;
}
