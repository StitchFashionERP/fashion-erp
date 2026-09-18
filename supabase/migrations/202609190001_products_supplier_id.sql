alter table public.products
  add column if not exists supplier_id uuid references public.suppliers(id);

create index if not exists products_supplier_id_idx
  on public.products (supplier_id);
