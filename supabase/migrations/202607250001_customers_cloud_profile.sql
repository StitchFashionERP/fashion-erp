alter table public.customers
  add column if not exists legacy_id text,
  add column if not exists profile jsonb not null default '{}'::jsonb;

create unique index if not exists customers_organization_legacy_id_key
  on public.customers (organization_id, legacy_id)
  where legacy_id is not null;
