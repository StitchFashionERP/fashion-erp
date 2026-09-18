create table if not exists public.supplier_product_color_moqs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  supplier_id uuid not null
    references public.suppliers(id) on delete cascade,
  product_id uuid not null
    references public.products(id) on delete cascade,
  color text not null,
  minimum_order_quantity integer not null default 0
    check (minimum_order_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, supplier_id, product_id, color)
);

create index if not exists supplier_product_color_moqs_supplier_idx
  on public.supplier_product_color_moqs
  (organization_id, supplier_id);

create index if not exists supplier_product_color_moqs_product_idx
  on public.supplier_product_color_moqs
  (organization_id, product_id);

alter table public.supplier_product_color_moqs enable row level security;

drop policy if exists
  "Organization members can read supplier product color moqs"
  on public.supplier_product_color_moqs;

create policy
  "Organization members can read supplier product color moqs"
  on public.supplier_product_color_moqs
  for select
  using (
    public.is_organization_member(organization_id)
  );

drop policy if exists
  "Organization members can insert supplier product color moqs"
  on public.supplier_product_color_moqs;

create policy
  "Organization members can insert supplier product color moqs"
  on public.supplier_product_color_moqs
  for insert
  with check (
    public.is_organization_member(organization_id)
  );

drop policy if exists
  "Organization members can update supplier product color moqs"
  on public.supplier_product_color_moqs;

create policy
  "Organization members can update supplier product color moqs"
  on public.supplier_product_color_moqs
  for update
  using (
    public.is_organization_member(organization_id)
  )
  with check (
    public.is_organization_member(organization_id)
  );

drop policy if exists
  "Organization members can delete supplier product color moqs"
  on public.supplier_product_color_moqs;

create policy
  "Organization members can delete supplier product color moqs"
  on public.supplier_product_color_moqs
  for delete
  using (
    public.is_organization_member(organization_id)
  );
