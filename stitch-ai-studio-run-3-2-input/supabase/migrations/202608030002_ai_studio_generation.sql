alter table public.ai_studio_jobs
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists generation_prompt text,
  add column if not exists generation_started_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists ai_studio_jobs_status_idx
  on public.ai_studio_jobs (
    organization_id,
    status,
    created_at desc
  );
