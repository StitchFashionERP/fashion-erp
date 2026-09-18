create table if not exists public.purchase_planning_product_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  product_id uuid not null
    references public.products(id) on delete cascade,
  decision text not null
    check (decision in ('PRODUCE', 'DO_NOT_PRODUCE')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id)
);

create index if not exists purchase_planning_product_decisions_organization_idx
  on public.purchase_planning_product_decisions(organization_id);

create index if not exists purchase_planning_product_decisions_product_idx
  on public.purchase_planning_product_decisions(product_id);

alter table public.purchase_planning_product_decisions
  enable row level security;

drop policy if exists "members select purchase planning decisions"
  on public.purchase_planning_product_decisions;

create policy "members select purchase planning decisions"
on public.purchase_planning_product_decisions
for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "members insert purchase planning decisions"
  on public.purchase_planning_product_decisions;

create policy "members insert purchase planning decisions"
on public.purchase_planning_product_decisions
for insert to authenticated
with check (public.is_organization_member(organization_id));

drop policy if exists "members update purchase planning decisions"
  on public.purchase_planning_product_decisions;

create policy "members update purchase planning decisions"
on public.purchase_planning_product_decisions
for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "members delete purchase planning decisions"
  on public.purchase_planning_product_decisions;

create policy "members delete purchase planning decisions"
on public.purchase_planning_product_decisions
for delete to authenticated
using (public.is_organization_member(organization_id));
