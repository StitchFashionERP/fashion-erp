import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStockBalance,
  reserveStock,
  syncVariantStockProfilesBatch,
} from "@/lib/stock-service";

const openSalesOrderStatuses = ["Bevestigd", "Gereserveerd"];
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Reserves as much of `quantityNeeded` as the current stock balance allows
 * (never more), updates the line's reserved_quantity to match, and returns
 * the amount actually reserved. Any shortfall stays an explicit backorder
 * (quantity - deliveredQuantity - reservedQuantity), it is never queued or
 * retried here — see topUpBackordersForVariant for that.
 *
 * This is the single-line path, still used by the low-volume /allocate and
 * receive-triggered top-up flows. Saving a whole order uses reserveBatch
 * below instead, since a single-line-at-a-time loop does N times the number
 * of round trips a batch does.
 */
export async function reserveForSalesOrderLine(
  supabase: SupabaseClient,
  organizationId: string,
  locationId: string,
  line: {
    id: string;
    variantId: string;
    quantity: number;
    deliveredQuantity: number;
    reservedQuantity: number;
  },
): Promise<number> {
  const alreadyNeeded = Math.max(
    0,
    line.quantity - line.deliveredQuantity - line.reservedQuantity,
  );

  if (alreadyNeeded <= 0) {
    return 0;
  }

  const balance = await getStockBalance(
    organizationId,
    line.variantId,
    locationId,
  );

  const available = Math.max(
    0,
    Number(balance.quantity ?? 0) -
      Number(balance.reserved_quantity ?? 0),
  );

  const toReserve = Math.min(alreadyNeeded, available);

  if (toReserve <= 0) {
    return 0;
  }

  await reserveStock({
    organizationId,
    variantId: line.variantId,
    locationId,
    quantity: toReserve,
  });

  const { error } = await supabase
    .from("sales_order_lines")
    .update({
      reserved_quantity: line.reservedQuantity + toReserve,
    })
    .eq("id", line.id);

  if (error) {
    throw new Error(error.message);
  }

  return toReserve;
}

/**
 * Called after purchase stock increases for a variant. Finds every open
 * sales order line for that variant with an outstanding backorder, oldest
 * order first (FIFO), and reserves newly available stock against them in
 * that order until either the backorders or the stock run out.
 */
export async function topUpBackordersForVariant(
  supabase: SupabaseClient,
  organizationId: string,
  locationId: string,
  variantId: string,
) {
  const { data: lines, error } = await supabase
    .from("sales_order_lines")
    .select(
      "id, quantity, delivered_quantity, reserved_quantity, sales_orders!inner(id, status, order_date)",
    )
    .eq("organization_id", organizationId)
    .eq("variant_id", variantId);

  if (error) {
    throw new Error(error.message);
  }

  const backordered = (lines ?? [])
    .map((row: Record<string, unknown>) => {
      const order = Array.isArray(row.sales_orders)
        ? row.sales_orders[0]
        : row.sales_orders;

      return {
        id: String(row.id),
        variantId,
        quantity: Number(row.quantity ?? 0),
        deliveredQuantity: Number(row.delivered_quantity ?? 0),
        reservedQuantity: Number(row.reserved_quantity ?? 0),
        orderStatus: String(
          (order as Record<string, unknown> | undefined)?.status ?? "",
        ),
        orderDate: String(
          (order as Record<string, unknown> | undefined)?.order_date ?? "",
        ),
      };
    })
    .filter(
      (line) =>
        openSalesOrderStatuses.includes(line.orderStatus) &&
        line.quantity - line.deliveredQuantity - line.reservedQuantity > 0,
    )
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate));

  for (const line of backordered) {
    await reserveForSalesOrderLine(
      supabase,
      organizationId,
      locationId,
      line,
    );
  }
}

type FullSalesOrderLineRow = {
  id: string;
  sales_order_id: string;
  variant_id: string;
  quantity: number;
  delivered_quantity: number;
  reserved_quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  profile: unknown;
};

/**
 * Batched reservation for every line of one order in a handful of queries
 * instead of ~6 per line. Reads the order's current lines and the stock
 * balances for their variants once each, computes how much each line can
 * get (respecting stock shared between lines on the same variant), then
 * writes stock_balances and sales_order_lines back in one upsert each.
 */
export async function reserveBatchForOrder(
  supabase: SupabaseClient,
  organizationId: string,
  locationId: string,
  salesOrderId: string,
) {
  const { data: lines, error: linesError } = await supabase
    .from("sales_order_lines")
    .select(
      "id, sales_order_id, variant_id, quantity, delivered_quantity, reserved_quantity, unit_price, discount_percentage, line_total, profile",
    )
    .eq("organization_id", organizationId)
    .eq("sales_order_id", salesOrderId);

  if (linesError) throw new Error(linesError.message);

  const rows = (lines ?? []) as FullSalesOrderLineRow[];

  const needing = rows
    .map((row) => ({
      row,
      need: Math.max(
        0,
        num(row.quantity) - num(row.delivered_quantity) - num(row.reserved_quantity),
      ),
    }))
    .filter((entry) => entry.need > 0);

  if (needing.length === 0) return;

  const variantIds = Array.from(
    new Set(needing.map((entry) => String(entry.row.variant_id))),
  );

  const { data: balances, error: balancesError } = await supabase
    .from("stock_balances")
    .select("variant_id, quantity, reserved_quantity")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .in("variant_id", variantIds);

  if (balancesError) throw new Error(balancesError.message);

  const balanceByVariant = new Map(
    variantIds.map((id) => [id, { quantity: 0, reserved: 0 }]),
  );

  for (const balance of balances ?? []) {
    balanceByVariant.set(String(balance.variant_id), {
      quantity: num(balance.quantity),
      reserved: num(balance.reserved_quantity),
    });
  }

  const reservedDeltaByVariant = new Map<string, number>();
  const lineUpdates: FullSalesOrderLineRow[] = [];

  for (const entry of needing) {
    const variantId = String(entry.row.variant_id);
    const balance = balanceByVariant.get(variantId) ?? {
      quantity: 0,
      reserved: 0,
    };
    const alreadyTakenThisBatch = reservedDeltaByVariant.get(variantId) ?? 0;
    const available = Math.max(
      0,
      balance.quantity - balance.reserved - alreadyTakenThisBatch,
    );
    const toReserve = Math.min(entry.need, available);

    if (toReserve <= 0) continue;

    reservedDeltaByVariant.set(variantId, alreadyTakenThisBatch + toReserve);

    lineUpdates.push({
      ...entry.row,
      reserved_quantity: num(entry.row.reserved_quantity) + toReserve,
    });
  }

  if (lineUpdates.length === 0) return;

  const balanceUpserts = Array.from(reservedDeltaByVariant.entries()).map(
    ([variantId, delta]) => {
      const balance = balanceByVariant.get(variantId) ?? {
        quantity: 0,
        reserved: 0,
      };

      return {
        organization_id: organizationId,
        location_id: locationId,
        variant_id: variantId,
        quantity: balance.quantity,
        reserved_quantity: balance.reserved + delta,
        updated_at: new Date().toISOString(),
      };
    },
  );

  const { error: balanceUpsertError } = await supabase
    .from("stock_balances")
    .upsert(balanceUpserts);

  if (balanceUpsertError) throw new Error(balanceUpsertError.message);

  const { error: lineUpsertError } = await supabase
    .from("sales_order_lines")
    .upsert(
      lineUpdates.map((row) => ({
        id: row.id,
        organization_id: organizationId,
        sales_order_id: row.sales_order_id,
        variant_id: row.variant_id,
        quantity: row.quantity,
        delivered_quantity: row.delivered_quantity,
        reserved_quantity: row.reserved_quantity,
        unit_price: row.unit_price,
        discount_percentage: row.discount_percentage,
        line_total: row.line_total,
        profile: row.profile,
      })),
    );

  if (lineUpsertError) throw new Error(lineUpsertError.message);

  await syncVariantStockProfilesBatch(organizationId, variantIds);
}

/**
 * Batched release for a set of {variantId, quantity} reservations that are
 * being freed at once (e.g. every line of a cancelled order). One read of
 * the affected stock_balances, one write, one profile sync — instead of a
 * getStockBalance + upsert + 3-query profile sync per line.
 */
export async function releaseBatch(
  supabase: SupabaseClient,
  organizationId: string,
  locationId: string,
  releases: Array<{ variantId: string; quantity: number }>,
) {
  const positive = releases.filter((r) => r.quantity > 0);
  if (positive.length === 0) return;

  const variantIds = Array.from(
    new Set(positive.map((r) => r.variantId)),
  );

  const { data: balances, error: balancesError } = await supabase
    .from("stock_balances")
    .select("variant_id, quantity, reserved_quantity")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .in("variant_id", variantIds);

  if (balancesError) throw new Error(balancesError.message);

  const balanceByVariant = new Map(
    variantIds.map((id) => [id, { quantity: 0, reserved: 0 }]),
  );

  for (const balance of balances ?? []) {
    balanceByVariant.set(String(balance.variant_id), {
      quantity: num(balance.quantity),
      reserved: num(balance.reserved_quantity),
    });
  }

  const releaseByVariant = new Map<string, number>();
  for (const release of positive) {
    releaseByVariant.set(
      release.variantId,
      (releaseByVariant.get(release.variantId) ?? 0) + release.quantity,
    );
  }

  const balanceUpserts = Array.from(releaseByVariant.entries()).map(
    ([variantId, amount]) => {
      const balance = balanceByVariant.get(variantId) ?? {
        quantity: 0,
        reserved: 0,
      };

      return {
        organization_id: organizationId,
        location_id: locationId,
        variant_id: variantId,
        quantity: balance.quantity,
        reserved_quantity: Math.max(0, balance.reserved - amount),
        updated_at: new Date().toISOString(),
      };
    },
  );

  const { error: upsertError } = await supabase
    .from("stock_balances")
    .upsert(balanceUpserts);

  if (upsertError) throw new Error(upsertError.message);

  await syncVariantStockProfilesBatch(organizationId, variantIds);
}
