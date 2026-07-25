create table if not exists public.organization_cloud_storage (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  storage_key text not null,
  storage_value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, storage_key)
);

create index if not exists organization_cloud_storage_updated_at_idx
  on public.organization_cloud_storage (organization_id, updated_at desc);

alter table public.organization_cloud_storage enable row level security;

create policy "members read cloud business storage"
on public.organization_cloud_storage
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "members insert cloud business storage"
on public.organization_cloud_storage
for insert
to authenticated
with check (
  public.has_organization_role(
    organization_id,
    array['owner','admin','sales','purchasing','warehouse','finance']::public.organization_role[]
  )
);

create policy "members update cloud business storage"
on public.organization_cloud_storage
for update
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner','admin','sales','purchasing','warehouse','finance']::public.organization_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner','admin','sales','purchasing','warehouse','finance']::public.organization_role[]
  )
);

create policy "members delete cloud business storage"
on public.organization_cloud_storage
for delete
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner','admin','sales','purchasing','warehouse','finance']::public.organization_role[]
  )
);
