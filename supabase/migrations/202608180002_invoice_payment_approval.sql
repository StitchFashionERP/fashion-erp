alter table public.invoice_payments
add column if not exists status text not null default 'Pending';

alter table public.invoice_payments
add column if not exists approved_at timestamptz;

alter table public.invoice_payments
add column if not exists approved_by uuid
references auth.users(id);

create index if not exists invoice_payments_status_idx
on public.invoice_payments(status);
