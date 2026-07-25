alter table public.products
  add column if not exists legacy_id text,
  add column if not exists profile jsonb not null default '{}'::jsonb;

alter table public.product_variants
  add column if not exists legacy_id text,
  add column if not exists profile jsonb not null default '{}'::jsonb;

create unique index if not exists products_organization_legacy_id_unique
  on public.products (organization_id, legacy_id)
  where legacy_id is not null;

create unique index if not exists product_variants_organization_legacy_id_unique
  on public.product_variants (organization_id, legacy_id)
  where legacy_id is not null;
