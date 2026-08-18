alter table public.invoices
add column if not exists profile jsonb not null default '{}'::jsonb;


create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  invoice_id uuid not null
    references public.invoices(id) on delete cascade,

  variant_id uuid
    references public.product_variants(id),

  quantity numeric(14,3) not null default 0,
  unit_price numeric(14,4) not null default 0,
  discount_percentage numeric(7,4) not null default 0,
  line_total numeric(14,2) not null default 0,

  profile jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);


create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  invoice_id uuid not null
    references public.invoices(id) on delete cascade,

  payment_date date not null,
  amount numeric(14,2) not null default 0,
  method text,
  reference text,

  created_at timestamptz not null default now()
);


create index if not exists invoice_lines_invoice_id_idx
on public.invoice_lines(invoice_id);

create index if not exists invoice_payments_invoice_id_idx
on public.invoice_payments(invoice_id);


alter table public.invoice_lines enable row level security;
alter table public.invoice_payments enable row level security;


drop policy if exists "members select invoice_lines" on public.invoice_lines;
create policy "members select invoice_lines"
on public.invoice_lines for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "members insert invoice_lines" on public.invoice_lines;
create policy "members insert invoice_lines"
on public.invoice_lines for insert to authenticated
with check (public.is_organization_member(organization_id));

drop policy if exists "members update invoice_lines" on public.invoice_lines;
create policy "members update invoice_lines"
on public.invoice_lines for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete invoice_lines" on public.invoice_lines;
create policy "admins delete invoice_lines"
on public.invoice_lines for delete to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner','admin']::public.organization_role[]
  )
);


drop policy if exists "members select invoice_payments" on public.invoice_payments;
create policy "members select invoice_payments"
on public.invoice_payments for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "members insert invoice_payments" on public.invoice_payments;
create policy "members insert invoice_payments"
on public.invoice_payments for insert to authenticated
with check (public.is_organization_member(organization_id));

drop policy if exists "members update invoice_payments" on public.invoice_payments;
create policy "members update invoice_payments"
on public.invoice_payments for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "admins delete invoice_payments" on public.invoice_payments;
create policy "admins delete invoice_payments"
on public.invoice_payments for delete to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner','admin']::public.organization_role[]
  )
);
