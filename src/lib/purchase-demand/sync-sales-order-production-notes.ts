import type { SupabaseClient } from "@supabase/supabase-js";

const excludedSalesOrderStatuses = new Set(["Concept", "Geannuleerd"]);

export function buildProductionNote(color: string) {
  return `Niet in productie: ${color} wordt niet meer geproduceerd. Pas deze orderregel aan.`;
}

/**
 * Keeps the productionNote on affected sales_order_lines in sync with the
 * current production decision for a product/color. Runs after the decision
 * itself is saved; a failure here should not be treated as more severe than
 * the decision save itself, so callers may choose to log and continue.
 */
export async function syncSalesOrderProductionNotes(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
  color: string,
  decision: "PRODUCE" | "DO_NOT_PRODUCE",
) {
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .eq("color", color);

  if (variantsError) throw variantsError;

  const variantIds = (variants ?? []).map(
    (variant: { id: string }) => variant.id,
  );

  if (variantIds.length === 0) return;

  const { data: rawLines, error: linesError } = await supabase
    .from("sales_order_lines")
    .select("id, profile, sales_orders(status)")
    .eq("organization_id", organizationId)
    .in("variant_id", variantIds);

  if (linesError) throw linesError;

  const lines = (rawLines ?? []) as Array<{
    id: string;
    profile: unknown;
    sales_orders: { status?: string } | { status?: string }[] | null;
  }>;

  const note =
    decision === "DO_NOT_PRODUCE" ? buildProductionNote(color) : "";

  for (const line of lines ?? []) {
    const orderStatus = Array.isArray(line.sales_orders)
      ? line.sales_orders[0]?.status
      : line.sales_orders?.status;

    if (excludedSalesOrderStatuses.has(String(orderStatus ?? ""))) {
      continue;
    }

    const profile =
      line.profile && typeof line.profile === "object"
        ? (line.profile as Record<string, unknown>)
        : {};

    if ((profile.productionNote ?? "") === note) continue;

    const { error: updateError } = await supabase
      .from("sales_order_lines")
      .update({
        profile: {
          ...profile,
          productionNote: note,
        },
      })
      .eq("id", line.id);

    if (updateError) throw updateError;
  }
}
