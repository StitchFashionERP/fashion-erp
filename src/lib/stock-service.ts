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
}
