alter table public.suppliers
  add column if not exists website text,
  add column if not exists eori_number text,
  add column if not exists country text not null default 'Nederland',
  add column if not exists currency text not null default 'EUR',
  add column if not exists moq numeric(14, 3),
  add column if not exists mov numeric(14, 2),
  add column if not exists lead_time_days integer,
  add column if not exists payment_mode text not null default 'net',
  add column if not exists discount_days integer,
  add column if not exists discount_percentage numeric(7, 4),
  add column if not exists split_payment_terms jsonb not null default '[]'::jsonb,
  add column if not exists contacts jsonb not null default '[]'::jsonb,
  add column if not exists notes text;

alter table public.suppliers
  drop constraint if exists suppliers_payment_mode_check;

alter table public.suppliers
  add constraint suppliers_payment_mode_check
  check (payment_mode in ('net', 'split'));

alter table public.suppliers
  drop constraint if exists suppliers_nonnegative_terms_check;

alter table public.suppliers
  add constraint suppliers_nonnegative_terms_check
  check (
    payment_days >= 0
    and (discount_days is null or discount_days >= 0)
    and (discount_percentage is null or discount_percentage >= 0)
    and (moq is null or moq >= 0)
    and (mov is null or mov >= 0)
    and (lead_time_days is null or lead_time_days >= 0)
  );
