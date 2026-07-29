import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentOrganization,
  requireUser,
} from "@/lib/auth/current-context";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const storageKey = "stitch-number-series-v1";

const defaultNumberSeries = [
  { key: "article", label: "Artikelen", prefix: "ART", separator: "", nextNumber: 1, digits: 5, active: true },
  { key: "salesOrder", label: "Verkooporders", prefix: "SO", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "purchaseOrder", label: "Inkooporders", prefix: "PO", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "invoice", label: "Facturen", prefix: "INV", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "creditNote", label: "Creditnota's", prefix: "CR", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "packingSlip", label: "Pakbonnen", prefix: "PK", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "goodsReceipt", label: "Goederenontvangsten", prefix: "GO", separator: "-", nextNumber: 1, digits: 5, active: true },
  { key: "return", label: "Retouren", prefix: "RET", separator: "-", nextNumber: 1, digits: 5, active: true },
] as const;

const allowedKeys = new Set(defaultNumberSeries.map((item) => item.key));

type ClaimBody = {
  key?: unknown;
};

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const organization = await getCurrentOrganization();
  const body = (await request.json().catch(() => null)) as ClaimBody | null;

  if (typeof body?.key !== "string" || !allowedKeys.has(body.key as never)) {
    return NextResponse.json(
      { error: "Ongeldige nummerreeks." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_number_series", {
    p_organization_id: organization.id,
    p_storage_key: storageKey,
    p_series_key: body.key,
    p_user_id: user.id,
    p_default_series: defaultNumberSeries,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (typeof data !== "string" || !data) {
    return NextResponse.json(
      { error: "De nummerreeks is niet actief of bestaat niet." },
      { status: 409 },
    );
  }

  return NextResponse.json({ number: data });
}
