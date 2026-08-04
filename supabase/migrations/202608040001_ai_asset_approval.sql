alter table public.ai_studio_jobs
  add column if not exists version_number integer,
  add column if not exists asset_status text
    not null default 'CONCEPT',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid
    references auth.users(id)
    on delete set null,
  add column if not exists is_primary boolean
    not null default false;

alter table public.ai_studio_jobs
  drop constraint if exists
    ai_studio_jobs_asset_status_check;

alter table public.ai_studio_jobs
  add constraint
    ai_studio_jobs_asset_status_check
  check (
    asset_status in (
      'CONCEPT',
      'APPROVED'
    )
  );

with ranked_jobs as (
  select
    id,
    row_number() over (
      partition by
        organization_id,
        coalesce(article_id::text, article_code),
        job_type
      order by
        created_at asc,
        id asc
    ) as generated_version
  from public.ai_studio_jobs
)
update public.ai_studio_jobs as jobs
set version_number = ranked_jobs.generated_version
from ranked_jobs
where ranked_jobs.id = jobs.id
  and jobs.version_number is null;

alter table public.ai_studio_jobs
  alter column version_number
  set not null;

create or replace function
  public.assign_ai_studio_job_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  version_scope text;
begin
  if new.version_number is not null then
    return new;
  end if;

  version_scope :=
    new.organization_id::text
    || ':'
    || coalesce(new.article_id::text, new.article_code, '')
    || ':'
    || new.job_type;

  perform pg_advisory_xact_lock(
    hashtext(version_scope)
  );

  select coalesce(max(version_number), 0) + 1
  into new.version_number
  from public.ai_studio_jobs
  where organization_id = new.organization_id
    and coalesce(article_id::text, article_code) =
      coalesce(new.article_id::text, new.article_code)
    and job_type = new.job_type;

  return new;
end;
$$;

drop trigger if exists
  assign_ai_studio_job_version_trigger
  on public.ai_studio_jobs;

create trigger
  assign_ai_studio_job_version_trigger
before insert
on public.ai_studio_jobs
for each row
execute function
  public.assign_ai_studio_job_version();

create unique index if not exists
  ai_studio_jobs_one_primary_asset_idx
on public.ai_studio_jobs (
  organization_id,
  article_id,
  job_type
)
where is_primary = true
  and article_id is not null;

create index if not exists
  ai_studio_jobs_asset_library_idx
on public.ai_studio_jobs (
  organization_id,
  asset_status,
  created_at desc
);

create index if not exists
  ai_studio_jobs_article_version_idx
on public.ai_studio_jobs (
  organization_id,
  article_id,
  job_type,
  version_number desc
);
