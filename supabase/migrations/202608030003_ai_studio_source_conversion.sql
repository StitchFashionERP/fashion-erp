alter table public.ai_studio_jobs
  add column if not exists processed_source_bucket text,
  add column if not exists processed_source_path text,
  add column if not exists processed_source_mime_type text,
  add column if not exists processed_source_file_size bigint,
  add column if not exists source_conversion_status text
    not null default 'NOT_REQUIRED',
  add column if not exists source_conversion_error text;

alter table public.ai_studio_jobs
  drop constraint if exists
    ai_studio_jobs_source_conversion_status_check;

alter table public.ai_studio_jobs
  add constraint
    ai_studio_jobs_source_conversion_status_check
  check (
    source_conversion_status in (
      'NOT_REQUIRED',
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED'
    )
  );

create index if not exists
  ai_studio_jobs_source_conversion_idx
on public.ai_studio_jobs (
  organization_id,
  source_conversion_status,
  created_at desc
);
