alter table public.ai_studio_jobs
  add column if not exists parent_job_id uuid
    references public.ai_studio_jobs(id)
    on delete set null;

create table if not exists public.ai_studio_reviews (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  source_job_id uuid not null
    references public.ai_studio_jobs(id)
    on delete cascade,

  next_job_id uuid
    references public.ai_studio_jobs(id)
    on delete set null,

  positive_points text[] not null default '{}',
  improvement_points text[] not null default '{}',
  comment text not null default '',

  status text not null default 'DRAFT'
    check (
      status in (
        'DRAFT',
        'SUBMITTED',
        'APPLIED'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists
  ai_studio_reviews_source_job_idx
on public.ai_studio_reviews (
  organization_id,
  source_job_id,
  created_at desc
);

create index if not exists
  ai_studio_jobs_parent_job_idx
on public.ai_studio_jobs (
  organization_id,
  parent_job_id,
  version_number
);

alter table public.ai_studio_reviews
  enable row level security;

create policy "Organization members can read AI reviews"
on public.ai_studio_reviews
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

create policy "Organization members can insert AI reviews"
on public.ai_studio_reviews
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
);

create policy "Organization members can update AI reviews"
on public.ai_studio_reviews
for update
to authenticated
using (
  public.is_organization_member(organization_id)
)
with check (
  public.is_organization_member(organization_id)
);

create policy "Organization members can delete AI reviews"
on public.ai_studio_reviews
for delete
to authenticated
using (
  public.is_organization_member(organization_id)
);
