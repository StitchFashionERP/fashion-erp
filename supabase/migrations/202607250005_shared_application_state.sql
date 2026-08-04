create table if not exists public.shared_application_state (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  storage_key text not null,
  storage_value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, storage_key)
);

alter table public.shared_application_state enable row level security;

create policy "Organization members can read shared application state"
on public.shared_application_state
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Organization members can insert shared application state"
on public.shared_application_state
for insert
to authenticated
with check (public.is_organization_member(organization_id));

create policy "Organization members can update shared application state"
on public.shared_application_state
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy "Organization members can delete shared application state"
on public.shared_application_state
for delete
to authenticated
using (public.is_organization_member(organization_id));

create index if not exists shared_application_state_updated_at_idx
  on public.shared_application_state (organization_id, updated_at desc);
