import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationRole } from "@/lib/auth/roles";

export type CurrentOrganization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: OrganizationRole;
};

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getOrganizationsForUser() {
  const supabase = await createClient();
  const user = await requireUser();

  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      role,
      organization:organizations (
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.organization.id,
    name: row.organization.name,
    slug: row.organization.slug,
    logoUrl: row.organization.logo_url,
    role: row.role as OrganizationRole,
  })) as CurrentOrganization[];
}

export async function getCurrentOrganization() {
  const supabase = await createClient();
  const organizations = await getOrganizationsForUser();

  if (organizations.length === 0) {
    redirect("/onboarding/no-organization");
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("active_organization_id")
    .maybeSingle();

  return (
    organizations.find(
      (organization) =>
        organization.id === data?.active_organization_id,
    ) ?? organizations[0]
  );
}
