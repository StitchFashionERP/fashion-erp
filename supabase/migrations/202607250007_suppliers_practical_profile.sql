alter table public.suppliers
  add column if not exists website text,
  add column if not exists province text,
  add column if not exists eori_number text,
  add column if not exists currency text not null default 'EUR',
  add column if not exists moq numeric(14, 3),
  add column if not exists mov numeric(14, 2),
  add column if not exists lead_time_days integer,
  add column if not exists contacts jsonb not null default '[]'::jsonb,
  add column if not exists payment_terms jsonb not null default '[{"id":"default","percentage":100,"moment":"Na factuurdatum","days":30,"discountPercentage":0}]'::jsonb,
  add column if not exists notes text;

alter table public.suppliers
  drop constraint if exists suppliers_moq_non_negative,
  add constraint suppliers_moq_non_negative
    check (moq is null or moq >= 0),
  drop constraint if exists suppliers_mov_non_negative,
  add constraint suppliers_mov_non_negative
    check (mov is null or mov >= 0),
  drop constraint if exists suppliers_lead_time_non_negative,
  add constraint suppliers_lead_time_non_negative
    check (lead_time_days is null or lead_time_days >= 0),
  drop constraint if exists suppliers_contacts_array,
  add constraint suppliers_contacts_array
    check (jsonb_typeof(contacts) = 'array'),
  drop constraint if exists suppliers_payment_terms_array,
  add constraint suppliers_payment_terms_array
    check (jsonb_typeof(payment_terms) = 'array');

update public.suppliers
set payment_terms = jsonb_build_array(
  jsonb_build_object(
    'id', 'migrated-' || id::text,
    'percentage', 100,
    'moment', 'Na factuurdatum',
    'days', payment_days,
    'discountPercentage', 0
  )
)
where payment_terms = '[{"id":"default","percentage":100,"moment":"Na factuurdatum","days":30,"discountPercentage":0}]'::jsonb
  and payment_days is distinct from 30;
