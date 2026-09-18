create table if not exists public.sales_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  delivery_number text not null,
  sales_order_id uuid not null
    references public.sales_orders(id) on delete cascade,
  delivery_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, delivery_number)
);

create table if not exists public.sales_delivery_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  sales_delivery_id uuid not null
    references public.sales_deliveries(id) on delete cascade,
  sales_order_line_id uuid not null
    references public.sales_order_lines(id) on delete cascade,
  product_id uuid,
  variant_id uuid not null
    references public.product_variants(id),
  sku text,
  product_name text,
  color text,
  size text,
  quantity numeric(14,3) not null
);

create index if not exists sales_deliveries_sales_order_idx
  on public.sales_deliveries(sales_order_id);

create index if not exists sales_delivery_lines_delivery_idx
  on public.sales_delivery_lines(sales_delivery_id);

alter table public.sales_deliveries enable row level security;
alter table public.sales_delivery_lines enable row level security;

create policy "sales deliveries organization access"
on public.sales_deliveries
for all
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
)
with check (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
);

create policy "sales delivery lines organization access"
on public.sales_delivery_lines
for all
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
)
with check (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
);
