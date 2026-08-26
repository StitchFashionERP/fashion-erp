import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

class ApiError extends Error { constructor(message: string, public status = 500) { super(message); } }
type Row = Record<string, unknown>;
const rec = (v: unknown): Row => v && typeof v === "object" ? v as Row : {};
const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError("Je sessie is verlopen. Log opnieuw in.", 401);
  const { data: memberships, error } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).eq("active", true);
  if (error) throw new ApiError(error.message);
  const ids = (memberships ?? []).map((m: Row) => String(m.organization_id ?? "")).filter(Boolean);
  if (!ids.length) throw new ApiError("Er is geen actieve organisatie aan dit account gekoppeld.", 403);
  const { data: pref } = await supabase.from("user_preferences").select("active_organization_id").eq("user_id", user.id).maybeSingle();
  const preferred = String(pref?.active_organization_id ?? "");
  return { supabase, user, organizationId: ids.includes(preferred) ? preferred : ids[0] };
}

function lineFromRow(row: Row) {
  const p = rec(row.profile);
  return { ...p, id: String(row.id ?? ""), variantId: String(row.variant_id ?? p.variantId ?? ""), quantity: num(row.quantity), deliveredQuantity: num(row.delivered_quantity), reservedQuantity: num(row.reserved_quantity), unitPrice: num(row.unit_price), discountPercentage: num(row.discount_percentage) };
}
function orderFromRow(row: Row) {
  const p = rec(row.profile);
  const lines = Array.isArray(row.sales_order_lines) ? (row.sales_order_lines as Row[]).map(lineFromRow) : [];
  return { ...p, id: String(row.id ?? ""), orderNumber: String(row.order_number ?? ""), customerId: String(p.customerId ?? row.customer_id ?? ""), orderDate: String(row.order_date ?? ""), requestedDeliveryDate: String(row.requested_delivery_date ?? ""), status: String(row.status ?? "Concept"), notes: String(row.notes ?? ""), lines, createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? "") };
}
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function resolveCustomerId(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, suppliedId: string) {
  let query = supabase.from("customers").select("id").eq("organization_id", organizationId);
  query = isUuid(suppliedId) ? query.or(`id.eq.${suppliedId},legacy_id.eq.${suppliedId}`) : query.eq("legacy_id", suppliedId);
  const { data } = await query.limit(1).maybeSingle();
  if (!data?.id) throw new ApiError("De geselecteerde klant bestaat niet in Supabase.", 400);
  return String(data.id);
}
async function resolveVariantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  suppliedId: string,
  profile?: Row,
) {
  let query = supabase
    .from("product_variants")
    .select("id")
    .eq("organization_id", organizationId);

  query = isUuid(suppliedId)
    ? query.or(`id.eq.${suppliedId},legacy_id.eq.${suppliedId}`)
    : query.eq("legacy_id", suppliedId);

  let { data } = await query.limit(1).maybeSingle();

  if (!data?.id && profile?.sku) {
    const fallback = await supabase
      .from("product_variants")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("sku", String(profile.sku))
      .eq("color", String(profile.color ?? ""))
      .eq("size", String(profile.size ?? ""))
      .limit(1)
      .maybeSingle();

    data = fallback.data;
  }

  if (!data?.id) {
    throw new ApiError(
      `Artikelvariant ${suppliedId} bestaat niet in Supabase.`,
      400,
    );
  }

  return String(data.id);
}

function response(error: unknown) { const e = error instanceof ApiError ? error : new ApiError(error instanceof Error ? error.message : "De verkooporderbewerking is mislukt."); return NextResponse.json({ error: e.message }, { status: e.status }); }

export async function GET() {
  try {
    const { supabase, organizationId } = await context();
    const { data, error } = await supabase.from("sales_orders").select("*, sales_order_lines(*)").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) throw new ApiError(error.message);
    return NextResponse.json((data ?? []).map((r: Row) => orderFromRow(r)));
  } catch (e) { return response(e); }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Row;
    const lines = Array.isArray(input.lines) ? input.lines as Row[] : [];
    if (!String(input.customerId ?? "") || !lines.length) throw new ApiError("Selecteer een klant en minimaal één artikelregel.", 400);
    const { supabase, organizationId, user } = await context();
    const customerId = await resolveCustomerId(supabase, organizationId, String(input.customerId));
    const year = new Date().getFullYear();
    const { data: latest } = await supabase.from("sales_orders").select("order_number").eq("organization_id", organizationId).like("order_number", `V${year}-%`).order("order_number", { ascending: false }).limit(1).maybeSingle();
    const sequence = Number(String(latest?.order_number ?? "").split("-")[1] ?? 0) + 1;
    const orderNumber = `V${year}-${String(sequence).padStart(5, "0")}`;
    const subtotalBeforeDiscount = lines.reduce((t, l) => t + num(l.quantity) * num(l.unitPrice), 0);
    const discount = lines.reduce((t, l) => t + num(l.quantity) * num(l.unitPrice) * num(l.discountPercentage) / 100, 0);
    const subtotal = subtotalBeforeDiscount - discount; const vat = subtotal * .21;
    const now = new Date().toISOString();
    console.log("CREATE SALES ORDER EMAIL DATA", {
      email: input.email,
      orderEmail: input.orderEmail,
      invoiceEmail: input.invoiceEmail,
      deliveryEmail: input.deliveryEmail,
    });

    const profile = { ...input, orderNumber, orderDate: now.slice(0,10), createdAt: now, updatedAt: now };
    const { data: order, error } = await supabase.from("sales_orders").insert({ organization_id: organizationId, order_number: orderNumber, customer_id: customerId, order_date: now.slice(0,10), requested_delivery_date: String(input.requestedDeliveryDate ?? "") || null, status: String(input.status ?? "Concept") === "Concept" ? "Concept" : "Bevestigd", notes: String(input.notes ?? "") || null, subtotal, vat, total: subtotal + vat, created_by: user.id, profile }).select("*").single();
    if (error) throw new ApiError(error.message);
    const lineRows = [];
    for (const line of lines) {
      const variantId = await resolveVariantId(
        supabase,
        organizationId,
        String(line.variantId ?? ""),
        line,
      );
      const quantity = num(line.quantity); const unitPrice = num(line.unitPrice); const discountPercentage = num(line.discountPercentage);
      lineRows.push({ organization_id: organizationId, sales_order_id: order.id, variant_id: variantId, quantity, delivered_quantity: 0, reserved_quantity: 0, unit_price: unitPrice, discount_percentage: discountPercentage, line_total: quantity * unitPrice * (1 - discountPercentage / 100), profile: line });
    }
    const { error: lineError } = await supabase.from("sales_order_lines").insert(lineRows);
    if (lineError) { await supabase.from("sales_orders").delete().eq("id", order.id); throw new ApiError(lineError.message); }
    const { data: complete, error: completeError } = await supabase.from("sales_orders").select("*, sales_order_lines(*)").eq("id", order.id).single();
    if (completeError) throw new ApiError(completeError.message);
    return NextResponse.json(orderFromRow(complete as Row), { status: 201 });
  } catch (e) { return response(e); }
}
