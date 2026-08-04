create table if not exists public.ai_studio_jobs (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  article_id uuid
    references public.products(id)
    on delete set null,

  article_code text not null default '',
  article_name text not null default '',

  job_type text not null
    check (
      job_type in (
        'SOURCE_ENHANCEMENT',
        'PRODUCT_SHOT',
        'MODEL_SHOT'
      )
    ),

  status text not null default 'CONCEPT'
    check (
      status in (
        'CONCEPT',
        'QUEUED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
      )
    ),

  preset_name text not null default '',
  instructions text not null default '',

  source_bucket text,
  source_path text,
  source_file_name text,
  source_mime_type text,
  source_file_size bigint,

  result_bucket text,
  result_path text,

  error_message text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_studio_jobs_organization_created_idx
  on public.ai_studio_jobs (
    organization_id,
    created_at desc
  );

create index if not exists ai_studio_jobs_article_idx
  on public.ai_studio_jobs (
    organization_id,
    article_id
  );

alter table public.ai_studio_jobs
  enable row level security;

drop policy if exists
  "Organization members can read AI Studio jobs"
  on public.ai_studio_jobs;

create policy
  "Organization members can read AI Studio jobs"
on public.ai_studio_jobs
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

drop policy if exists
  "Organization members can insert AI Studio jobs"
  on public.ai_studio_jobs;

create policy
  "Organization members can insert AI Studio jobs"
on public.ai_studio_jobs
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
);

drop policy if exists
  "Organization members can update AI Studio jobs"
  on public.ai_studio_jobs;

create policy
  "Organization members can update AI Studio jobs"
on public.ai_studio_jobs
for update
to authenticated
using (
  public.is_organization_member(organization_id)
)
with check (
  public.is_organization_member(organization_id)
);

drop policy if exists
  "Organization members can delete AI Studio jobs"
  on public.ai_studio_jobs;

create policy
  "Organization members can delete AI Studio jobs"
on public.ai_studio_jobs
for delete
to authenticated
using (
  public.is_organization_member(organization_id)
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ai-studio',
  'ai-studio',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists
  "Organization members can read AI Studio files"
  on storage.objects;

create policy
  "Organization members can read AI Studio files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ai-studio'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);

drop policy if exists
  "Organization members can upload AI Studio files"
  on storage.objects;

create policy
  "Organization members can upload AI Studio files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ai-studio'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);

drop policy if exists
  "Organization members can update AI Studio files"
  on storage.objects;

create policy
  "Organization members can update AI Studio files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ai-studio'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
)
with check (
  bucket_id = 'ai-studio'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);

drop policy if exists
  "Organization members can delete AI Studio files"
  on storage.objects;

create policy
  "Organization members can delete AI Studio files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ai-studio'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);
