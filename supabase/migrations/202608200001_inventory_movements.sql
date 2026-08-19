create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  variant_id uuid not null
    references public.product_variants(id)
    on delete cascade,

  location_id uuid not null
    references public.stock_locations(id)
    on delete cascade,

  movement_type text not null,

  quantity numeric(14, 3) not null,

  reference_type text,
  reference_id uuid,

  notes text,

  created_by uuid
    references auth.users(id),

  created_at timestamptz not null default now()
);

create index inventory_movements_variant_idx
  on public.inventory_movements(variant_id);

create index inventory_movements_reference_idx
  on public.inventory_movements(reference_id);

create index inventory_movements_created_at_idx
  on public.inventory_movements(created_at);
