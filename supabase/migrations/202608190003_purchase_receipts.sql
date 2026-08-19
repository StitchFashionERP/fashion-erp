create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  receipt_number text not null,
  purchase_order_id uuid not null
    references public.purchase_orders(id) on delete cascade,
  receipt_date date not null default current_date,
  packing_slip_number text,
  received_by text,
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, receipt_number)
);

create table if not exists public.purchase_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  purchase_receipt_id uuid not null
    references public.purchase_receipts(id) on delete cascade,
  purchase_order_line_id uuid not null
    references public.purchase_order_lines(id) on delete cascade,
  product_id uuid,
  variant_id uuid not null
    references public.product_variants(id),
  sku text,
  product_name text,
  color text,
  size text,
  quantity numeric(14,3) not null
);

alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_lines enable row level security;
