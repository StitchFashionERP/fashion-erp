alter table public.inventory_movements
enable row level security;

create policy "Authenticated users can view inventory movements"
on public.inventory_movements
for select
to authenticated
using (true);

create policy "Authenticated users can insert inventory movements"
on public.inventory_movements
for insert
to authenticated
with check (true);

create policy "Authenticated users can update inventory movements"
on public.inventory_movements
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete inventory movements"
on public.inventory_movements
for delete
to authenticated
using (true);
