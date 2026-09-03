import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
type Row = Record<string, unknown>;
class ApiError extends Error { constructor(message: string, public status = 500) { super(message); } }
const rec = (v: unknown): Row => v && typeof v === "object" ? v as Row : {};
const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
async function context() { const supabase = await createClient(); const { data:{user} } = await supabase.auth.getUser(); if(!user) throw new ApiError("Je sessie is verlopen. Log opnieuw in.",401); const {data,error}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).eq("active",true); if(error) throw new ApiError(error.message); const ids=(data??[]).map((m:Row)=>String(m.organization_id??"")).filter(Boolean); if(!ids.length) throw new ApiError("Er is geen actieve organisatie gekoppeld.",403); return {supabase,organizationId:ids[0]}; }
function line(row:Row){
  const p = rec(row.profile);

  return {
    ...p,
    id: String(row.id ?? ""),
    variantId: String(row.variant_id ?? p.variantId ?? ""),
    productId: String(row.product_id ?? p.productId ?? ""),
    sku: String(row.sku ?? p.sku ?? ""),
    color: String(row.color ?? p.color ?? ""),
    size: String(row.size ?? p.size ?? ""),
    quantity: num(row.quantity),
    deliveredQuantity: num(row.delivered_quantity),
    reservedQuantity: num(row.reserved_quantity),
    unitPrice: num(row.unit_price),
    discountPercentage: num(row.discount_percentage),
  };
}
function order(row:Row){const p=rec(row.profile);return {...p,id:String(row.id??""),orderNumber:String(row.order_number??""),orderDate:String(row.order_date??""),requestedDeliveryDate:String(row.requested_delivery_date??""),status:String(row.status??"Concept"),notes:String(row.notes??""),lines:Array.isArray(row.sales_order_lines)?(row.sales_order_lines as Row[]).map(line):[],createdAt:String(row.created_at??""),updatedAt:String(row.updated_at??"")};}
function response(e:unknown){const x=e instanceof ApiError?e:new ApiError(e instanceof Error?e.message:"De verkooporderbewerking is mislukt.");return NextResponse.json({error:x.message},{status:x.status});}
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const {supabase,organizationId}=await context();const {data,error}=await supabase.from("sales_orders").select("*, sales_order_lines(*)").eq("organization_id",organizationId).eq("id",id).maybeSingle();if(error)throw new ApiError(error.message);if(!data)throw new ApiError("Verkooporder niet gevonden.",404);return NextResponse.json(order(data as Row));}catch(e){return response(e);}}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const input=await request.json() as Row;const lines=Array.isArray(input.lines)?input.lines as Row[]:[];
console.log("PUT SALES ORDER LINES", JSON.stringify(lines, null, 2));const {supabase,organizationId}=await context();const subtotalBefore=lines.reduce((t,l)=>t+num(l.quantity)*num(l.unitPrice),0);const discount=lines.reduce((t,l)=>t+num(l.quantity)*num(l.unitPrice)*num(l.discountPercentage)/100,0);const subtotal=subtotalBefore-discount;const updatedAt=new Date().toISOString();const {error}=await supabase.from("sales_orders").update({status:String(input.status??"Concept"),requested_delivery_date:String(input.requestedDeliveryDate??"")||null,notes:String(input.notes??"")||null,subtotal,vat:subtotal*.21,total:subtotal*1.21,profile:{...input,updatedAt},updated_at:updatedAt}).eq("organization_id",organizationId).eq("id",id);if(error)throw new ApiError(error.message);for(const l of lines){

  if(l.id){
    const { data: existingLine } = await supabase
      .from("sales_order_lines")
      .select("profile")
      .eq("organization_id", organizationId)
      .eq("id", String(l.id))
      .single();

    const existingProfile = rec(existingLine?.profile);

    const {error:le}=await supabase.from("sales_order_lines").update({
      quantity:num(l.quantity),
      delivered_quantity:num(l.deliveredQuantity),
      reserved_quantity:num(l.reservedQuantity),
      unit_price:num(l.unitPrice),
      discount_percentage:num(l.discountPercentage),
      line_total:num(l.quantity)*num(l.unitPrice)*(1-num(l.discountPercentage)/100),
      profile:{
        ...existingProfile,
        ...l,
      }
    }).eq("organization_id",organizationId).eq("id",String(l.id));

    if(le)throw new ApiError(le.message);

  } else {

    const variantId = String(l.variantId ?? "");

    if(!variantId) {
      throw new ApiError("Nieuwe orderregel heeft geen variant.",400);
    }

    const { error: insertError } = await supabase
      .from("sales_order_lines")
      .insert({
        organization_id: organizationId,
        sales_order_id: id,
        variant_id: variantId,
        quantity:num(l.quantity),
        delivered_quantity:0,
        reserved_quantity:0,
        unit_price:num(l.unitPrice),
        discount_percentage:num(l.discountPercentage),
        line_total:num(l.quantity)*num(l.unitPrice)*(1-num(l.discountPercentage)/100),
        profile:l,
      });

    if(insertError) throw new ApiError(insertError.message);
  }
}const {data,error:readError}=await supabase.from("sales_orders").select("*, sales_order_lines(*)").eq("id",id).single();if(readError)throw new ApiError(readError.message);return NextResponse.json(order(data as Row));}catch(e){return response(e);}}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const {supabase,organizationId}=await context();const {data}=await supabase.from("sales_orders").select("status").eq("organization_id",organizationId).eq("id",id).maybeSingle();if(!data)throw new ApiError("Verkooporder niet gevonden.",404);if(data.status!=="Concept")throw new ApiError("Alleen conceptorders kunnen worden verwijderd.",400);const {error}=await supabase.from("sales_orders").delete().eq("organization_id",organizationId).eq("id",id);if(error)throw new ApiError(error.message);return NextResponse.json({ok:true});}catch(e){return response(e);}}
