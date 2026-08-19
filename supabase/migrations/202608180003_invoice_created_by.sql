alter table public.invoices
add column if not exists created_by uuid
references auth.users(id);
