import { createClient } from "@/lib/supabase/server";

const storageKey = "stitch-number-series-v1";

const defaultNumberSeries = [
  {
    key: "invoice",
    label: "Facturen",
    prefix: "INV",
    separator: "-",
    nextNumber: 1,
    digits: 5,
    active: true,
  },
  {
    key: "purchase_order",
    label: "Inkooporders",
    prefix: "PO",
    separator: "-",
    nextNumber: 1,
    digits: 5,
    active: true,
  },
];

type NumberSeriesKey =
  | "invoice"
  | "purchase_order";

export async function claimNextNumberServer(
  key: NumberSeriesKey,
) {
  const supabase = await createClient();

  const { data: userData } =
    await supabase.auth.getUser();

  if (!userData.user) {
    throw new Error(
      "Geen actieve gebruiker.",
    );
  }

  const { data: memberships } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq(
        "user_id",
        userData.user.id,
      )
      .eq(
        "active",
        true,
      );

  const organizationId =
    memberships?.[0]?.organization_id;

  if (!organizationId) {
    throw new Error(
      "Geen organisatie gevonden.",
    );
  }

  const { data, error } =
    await supabase.rpc(
      "claim_number_series",
      {
        p_organization_id:
          organizationId,
        p_storage_key:
          storageKey,
        p_series_key:
          key,
        p_user_id:
          userData.user.id,
        p_default_series:
          defaultNumberSeries,
      },
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Nummerreeks niet beschikbaar.",
    );
  }

  return String(data);
}
