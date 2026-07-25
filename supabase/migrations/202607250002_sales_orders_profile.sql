alter table public.sales_orders
  add column if not exists profile jsonb not null default '{}'::jsonb;

alter table public.sales_order_lines
  add column if not exists profile jsonb not null default '{}'::jsonb;
