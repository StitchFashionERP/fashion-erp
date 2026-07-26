-- STiTch: centrale bedrijfsinstellingen per organisatie
-- Voer dit bestand één keer uit in Supabase SQL Editor.

create table if not exists public.company_settings (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

drop policy if exists "company_settings_select_for_members"
  on public.company_settings;

create policy "company_settings_select_for_members"
  on public.company_settings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = company_settings.organization_id
        and member.user_id = auth.uid()
        and member.active = true
    )
  );

drop policy if exists "company_settings_insert_for_members"
  on public.company_settings;

create policy "company_settings_insert_for_members"
  on public.company_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = company_settings.organization_id
        and member.user_id = auth.uid()
        and member.active = true
    )
  );

drop policy if exists "company_settings_update_for_members"
  on public.company_settings;

create policy "company_settings_update_for_members"
  on public.company_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = company_settings.organization_id
        and member.user_id = auth.uid()
        and member.active = true
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = company_settings.organization_id
        and member.user_id = auth.uid()
        and member.active = true
    )
  );

create index if not exists company_settings_updated_at_idx
  on public.company_settings(updated_at desc);
