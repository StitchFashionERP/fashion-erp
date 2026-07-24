-- Maak eerst een gebruiker aan via Supabase Auth.
-- Vervang USER_UUID.

do $$
declare
  organization_uuid uuid;
  first_user uuid := 'USER_UUID'::uuid;
begin
  insert into public.organizations (
    name,
    slug,
    trade_name,
    country_code
  )
  values (
    'Eerste STITCH-administratie',
    'eerste-administratie',
    'Eerste STITCH-administratie',
    'NL'
  )
  returning id into organization_uuid;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    organization_uuid,
    first_user,
    'owner'
  );

  insert into public.user_preferences (
    user_id,
    active_organization_id
  )
  values (
    first_user,
    organization_uuid
  );

  insert into public.stock_locations (
    organization_id,
    code,
    name
  )
  values (
    organization_uuid,
    'MAIN',
    'Hoofdvoorraad'
  );
end $$;
