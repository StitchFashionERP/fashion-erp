import { createClient } from "@/lib/supabase/server";

type StockChange = {
  organizationId: string;
  variantId: string;
  quantity: number;
  locationId: string;
  movementType?: string;
  referenceType?: string;
  referenceId?: string;
};

/**
 * product_variants still carries its own physicalStock/reservedStock in its
 * profile JSON (read by the articles UI, the stock overview page and the
 * sales order form's availability check). stock_balances is the real,
 * per-location source of truth now, so every change here mirrors the
 * variant-wide total back into that profile to keep those older screens
 * showing the same numbers.
 */
async function syncVariantStockProfile(
  organizationId: string,
  variantId: string,
) {
  const supabase = await createClient();

  const { data: balances, error: balancesError } = await supabase
    .from("stock_balances")
    .select("quantity, reserved_quantity")
    .eq("organization_id", organizationId)
    .eq("variant_id", variantId);

  if (balancesError) {
    throw new Error(balancesError.message);
  }

  const totalQuantity = (balances ?? []).reduce(
    (sum, balance) => sum + Number(balance.quantity ?? 0),
    0,
  );

  const totalReserved = (balances ?? []).reduce(
    (sum, balance) =>
      sum + Number(balance.reserved_quantity ?? 0),
    0,
  );

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("profile")
    .eq("organization_id", organizationId)
    .eq("id", variantId)
    .maybeSingle();

  if (variantError) {
    throw new Error(variantError.message);
  }

  const profile =
    variant?.profile && typeof variant.profile === "object"
      ? (variant.profile as Record<string, unknown>)
      : {};

  const { error: updateError } = await supabase
    .from("product_variants")
    .update({
      profile: {
        ...profile,
        physicalStock: totalQuantity,
        reservedStock: totalReserved,
      },
    })
    .eq("organization_id", organizationId)
    .eq("id", variantId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

/**
 * Batched version of syncVariantStockProfile: does one query to read all
 * stock_balances for the given variants, one query to read their current
 * profiles, and one bulk upsert to write them back — instead of 3 queries
 * per variant. Callers that touch many variants in one request (e.g. saving
 * a large sales order) should always use this instead of calling
 * syncVariantStockProfile in a per-line loop.
 */
export async function syncVariantStockProfilesBatch(
  organizationId: string,
  variantIds: string[],
) {
  const uniqueIds = Array.from(new Set(variantIds));

  if (uniqueIds.length === 0) return;

  const supabase = await createClient();

  const { data: balances, error: balancesError } = await supabase
    .from("stock_balances")
    .select("variant_id, quantity, reserved_quantity")
    .eq("organization_id", organizationId)
    .in("variant_id", uniqueIds);

  if (balancesError) {
    throw new Error(balancesError.message);
  }

  const totalsByVariant = new Map<
    string,
    { quantity: number; reserved: number }
  >();

  for (const id of uniqueIds) {
    totalsByVariant.set(id, { quantity: 0, reserved: 0 });
  }

  for (const balance of balances ?? []) {
    const totals = totalsByVariant.get(String(balance.variant_id));
    if (!totals) continue;
    totals.quantity += Number(balance.quantity ?? 0);
    totals.reserved += Number(balance.reserved_quantity ?? 0);
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, profile")
    .eq("organization_id", organizationId)
    .in("id", uniqueIds);

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  const updates = (variants ?? []).map((variant) => {
    const profile =
      variant.profile && typeof variant.profile === "object"
        ? (variant.profile as Record<string, unknown>)
        : {};

    const totals = totalsByVariant.get(String(variant.id)) ?? {
      quantity: 0,
      reserved: 0,
    };

    return {
      id: variant.id,
      organization_id: organizationId,
      product_id: variant.product_id,
      sku: variant.sku,
      profile: {
        ...profile,
        physicalStock: totals.quantity,
        reservedStock: totals.reserved,
      },
    };
  });

  if (updates.length === 0) return;

  const { error: updateError } = await supabase
    .from("product_variants")
    .upsert(updates);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function getStockBalance(
  organizationId: string,
  variantId: string,
  locationId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_balances")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("variant_id", variantId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (
    data ?? {
      quantity: 0,
      reserved_quantity: 0,
    }
  );
}


export async function increaseStock(
  input: StockChange,
) {
  const supabase = await createClient();

  const current = await getStockBalance(
    input.organizationId,
    input.variantId,
    input.locationId,
  );

  const quantity =
    Number(current.quantity ?? 0) +
    input.quantity;

  const { error } = await supabase
    .from("stock_balances")
    .upsert({
      organization_id:
        input.organizationId,
      variant_id:
        input.variantId,
      location_id:
        input.locationId,
      quantity,
      reserved_quantity:
        Number(
          current.reserved_quantity ?? 0,
        ),
      updated_at:
        new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }

  const { error: movementError } =
    await supabase
      .from("inventory_movements")
      .insert({
        organization_id:
          input.organizationId,
        variant_id:
          input.variantId,
        location_id:
          input.locationId,
        movement_type:
          input.movementType ?? "CORRECTION",
        quantity:
          input.quantity,
        reference_type:
          input.referenceType ?? null,
        reference_id:
          input.referenceId ?? null,
      });

  if (movementError) {
    throw new Error(
      movementError.message,
    );
  }

  await syncVariantStockProfile(
    input.organizationId,
    input.variantId,
  );

  return quantity;
}


export async function reserveStock(
  input: StockChange,
) {
  const supabase = await createClient();

  const current = await getStockBalance(
    input.organizationId,
    input.variantId,
    input.locationId,
  );

  const available =
    Number(current.quantity ?? 0) -
    Number(
      current.reserved_quantity ?? 0,
    );

  if (available < input.quantity) {
    throw new Error(
      "Niet voldoende voorraad beschikbaar.",
    );
  }

  const { error } = await supabase
    .from("stock_balances")
    .upsert({
      organization_id:
        input.organizationId,
      variant_id:
        input.variantId,
      location_id:
        input.locationId,
      quantity:
        Number(current.quantity ?? 0),
      reserved_quantity:
        Number(
          current.reserved_quantity ?? 0,
        ) + input.quantity,
      updated_at:
        new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }

  await syncVariantStockProfile(
    input.organizationId,
    input.variantId,
  );
}


export async function releaseStock(
  input: StockChange,
) {
  const supabase = await createClient();

  const current = await getStockBalance(
    input.organizationId,
    input.variantId,
    input.locationId,
  );

  const { error } = await supabase
    .from("stock_balances")
    .upsert({
      organization_id:
        input.organizationId,
      variant_id:
        input.variantId,
      location_id:
        input.locationId,
      quantity:
        Number(current.quantity ?? 0),
      reserved_quantity:
        Math.max(
          0,
          Number(
            current.reserved_quantity ?? 0,
          ) - input.quantity,
        ),
      updated_at:
        new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }

  await syncVariantStockProfile(
    input.organizationId,
    input.variantId,
  );
}

/**
 * Goods physically leaving the warehouse for a customer: lowers both the
 * physical quantity and the reservation that was covering it. Unlike
 * releaseStock (which only frees a reservation for goods still on the
 * shelf), this assumes the reserved quantity is actually shipped.
 */
export async function shipStock(input: StockChange) {
  const supabase = await createClient();

  const current = await getStockBalance(
    input.organizationId,
    input.variantId,
    input.locationId,
  );

  const { error } = await supabase
    .from("stock_balances")
    .upsert({
      organization_id: input.organizationId,
      variant_id: input.variantId,
      location_id: input.locationId,
      quantity: Math.max(
        0,
        Number(current.quantity ?? 0) - input.quantity,
      ),
      reserved_quantity: Math.max(
        0,
        Number(current.reserved_quantity ?? 0) - input.quantity,
      ),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }

  const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      organization_id: input.organizationId,
      variant_id: input.variantId,
      location_id: input.locationId,
      movement_type: input.movementType ?? "SALES_SHIPMENT",
      quantity: -input.quantity,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
    });

  if (movementError) {
    throw new Error(movementError.message);
  }

  await syncVariantStockProfile(
    input.organizationId,
    input.variantId,
  );
}

/**
 * One-off backfill for variants whose stock_balances changed before
 * syncVariantStockProfile existed (or after any other drift). Safe to run
 * repeatedly; it just recomputes each variant's profile totals from the
 * current stock_balances rows.
 */
export async function resyncAllVariantStockProfiles(
  organizationId: string,
) {
  const supabase = await createClient();

  const { data: balances, error } = await supabase
    .from("stock_balances")
    .select("variant_id")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  const variantIds = Array.from(
    new Set(
      (balances ?? []).map((row) => String(row.variant_id)),
    ),
  );

  for (const variantId of variantIds) {
    await syncVariantStockProfile(organizationId, variantId);
  }

  return variantIds.length;
}
