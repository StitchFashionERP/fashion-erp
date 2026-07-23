
create extension if not exists pgcrypto;

create type public.organization_role as enum (
  'owner',
  'admin',
  'sales',
  'purchasing',
  'warehouse',
  'finance',
  'read_only'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  trade_name text,
  logo_url text,
  address text,
  postal_code text,
  city text,
  country_code text not null default 'NL',
  chamber_of_commerce_number text,
  vat_number text,
  iban text,
  email text,
  phone text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role public.organization_role not null default 'read_only',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.user_preferences (
  user_id uuid primary key
    references auth.users(id) on delete cascade,
  active_organization_id uuid
    references public.organizations(id) on delete set null,
  language text not null default 'nl',
  updated_at timestamptz not null default now()
);

create or replace function public.is_organization_member(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.active = true
  );
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.active = true
      and membership.role = any(allowed_roles)
  );
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  customer_number text not null,
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  country_code text not null default 'NL',
  chamber_of_commerce_number text,
  vat_number text,
  language text not null default 'nl',
  payment_days integer not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, customer_number)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  supplier_number text not null,
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  country_code text not null default 'NL',
  chamber_of_commerce_number text,
  vat_number text,
  language text not null default 'nl',
  payment_days integer not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_number)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  product_code text not null,
  name text not null,
  brand text,
  season text,
  category text,
  material text,
  vat_code text not null default '2V',
  sales_price numeric(14, 4) not null default 0,
  purchase_price numeric(14, 4) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_code)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  product_id uuid not null
    references public.products(id) on delete cascade,
  sku text not null,
  color text,
  color_code text,
  size text,
  barcode text,
  created_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  unique (organization_id, code)
);

create table public.stock_balances (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  location_id uuid not null
    references public.stock_locations(id) on delete cascade,
  variant_id uuid not null
    references public.product_variants(id) on delete cascade,
  quantity numeric(14, 3) not null default 0,
  reserved_quantity numeric(14, 3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organization_id, location_id, variant_id)
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  order_number text not null,
  customer_id uuid not null references public.customers(id),
  order_date date not null default current_date,
  requested_delivery_date date,
  status text not null default 'Concept',
  notes text,
  subtotal numeric(14, 2) not null default 0,
  vat numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  sales_order_id uuid not null
    references public.sales_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  quantity numeric(14, 3) not null,
  delivered_quantity numeric(14, 3) not null default 0,
  reserved_quantity numeric(14, 3) not null default 0,
  unit_price numeric(14, 4) not null,
  discount_percentage numeric(7, 4) not null default 0,
  line_total numeric(14, 2) not null
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  order_number text not null,
  supplier_id uuid not null references public.suppliers(id),
  order_date date not null default current_date,
  expected_delivery_date date,
  status text not null default 'Concept',
  notes text,
  subtotal numeric(14, 2) not null default 0,
  vat numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null
    references public.purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  ordered_quantity numeric(14, 3) not null,
  received_quantity numeric(14, 3) not null default 0,
  unit_price numeric(14, 4) not null,
  line_total numeric(14, 2) not null
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid not null references public.customers(id),
  sales_order_id uuid references public.sales_orders(id),
  invoice_date date not null default current_date,
  due_date date,
  status text not null default 'Concept',
  subtotal numeric(14, 2) not null default 0,
  vat numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  outstanding_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on public.organization_members(user_id);
create index on public.customers(organization_id);
create index on public.suppliers(organization_id);
create index on public.products(organization_id);
create index on public.sales_orders(organization_id);
create index on public.purchase_orders(organization_id);
create index on public.invoices(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.user_preferences enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.stock_locations enable row level security;
alter table public.stock_balances enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.audit_log enable row level security;

create policy "members view organizations"
on public.organizations for select to authenticated
using (public.is_organization_member(id));

create policy "members view memberships"
on public.organization_members for select to authenticated
using (public.is_organization_member(organization_id));

create policy "admins manage memberships"
on public.organization_members for all to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner','admin']::public.organization_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner','admin']::public.organization_role[]
  )
);

create policy "users manage own preferences"
on public.user_preferences for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers','suppliers','products','product_variants',
    'stock_locations','stock_balances','sales_orders',
    'sales_order_lines','purchase_orders','purchase_order_lines',
    'invoices','audit_log'
  ]
  loop
    execute format(
      'create policy "members select %1$s"
       on public.%1$I for select to authenticated
       using (public.is_organization_member(organization_id))',
      table_name
    );

    execute format(
      'create policy "members insert %1$s"
       on public.%1$I for insert to authenticated
       with check (public.is_organization_member(organization_id))',
      table_name
    );

    execute format(
      'create policy "members update %1$s"
       on public.%1$I for update to authenticated
       using (public.is_organization_member(organization_id))
       with check (public.is_organization_member(organization_id))',
      table_name
    );

    execute format(
      'create policy "admins delete %1$s"
       on public.%1$I for delete to authenticated
       using (
         public.has_organization_role(
           organization_id,
           array[''owner'',''admin'']::public.organization_role[]
         )
       )',
      table_name
    );
  end loop;
end $$;
