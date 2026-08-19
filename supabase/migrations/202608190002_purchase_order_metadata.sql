alter table public.purchase_orders
add column if not exists collection_code text,
add column if not exists currency text default 'EUR',
add column if not exists payment_days integer default 30,
add column if not exists supplier_reference text;
