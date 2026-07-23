import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";

export async function getCustomers() {
  const supabase = await createClient();
  const organization = await getCurrentOrganization();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("company_name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createCustomer(input: {
  customerNumber: string;
  companyName: string;
  email?: string;
  countryCode?: string;
}) {
  const supabase = await createClient();
  const organization = await getCurrentOrganization();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: organization.id,
      customer_number: input.customerNumber,
      company_name: input.companyName,
      email: input.email || null,
      country_code: input.countryCode || "NL",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
