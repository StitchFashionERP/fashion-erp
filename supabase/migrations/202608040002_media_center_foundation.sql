create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  name text not null,
  description text not null default '',

  kind text not null
    check (
      kind in (
        'IMAGE',
        'VIDEO',
        'DOCUMENT',
        'AUDIO',
        'OTHER'
      )
    ),

  category text not null
    check (
      category in (
        'SOURCE',
        'PACKSHOT',
        'DETAIL',
        'MODEL',
        'LIFESTYLE',
        'CAMPAIGN',
        'SOCIAL',
        'REFERENCE',
        'DOCUMENT',
        'OTHER'
      )
    ),

  status text not null default 'CONCEPT'
    check (
      status in (
        'CONCEPT',
        'APPROVED',
        'ARCHIVED'
      )
    ),

  origin text not null
    check (
      origin in (
        'UPLOAD',
        'AI',
        'IMPORT',
        'EXTERNAL'
      )
    ),

  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null default 0,

  width integer,
  height integer,

  version_number integer not null default 1,
  parent_asset_id uuid
    references public.media_assets(id)
    on delete set null,

  is_primary boolean not null default false,

  ai_provider text,
  ai_model text,
  ai_prompt text,
  ai_job_id uuid
    references public.ai_studio_jobs(id)
    on delete set null,

  created_by uuid
    references auth.users(id)
    on delete set null,

  approved_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  archived_at timestamptz,

  unique (
    organization_id,
    storage_bucket,
    storage_path
  )
);

create table if not exists public.media_asset_links (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  asset_id uuid not null
    references public.media_assets(id)
    on delete cascade,

  entity_type text not null
    check (
      entity_type in (
        'PRODUCT',
        'CAMPAIGN',
        'COLLECTION',
        'SUPPLIER',
        'CUSTOMER',
        'ORGANIZATION'
      )
    ),

  entity_id uuid not null,

  role text not null
    check (
      role in (
        'SOURCE',
        'PACKSHOT',
        'DETAIL',
        'MODEL',
        'LIFESTYLE',
        'CAMPAIGN',
        'SOCIAL',
        'REFERENCE',
        'DOCUMENT',
        'OTHER'
      )
    ),

  is_primary boolean not null default false,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    asset_id,
    entity_type,
    entity_id,
    role
  )
);

create index if not exists media_assets_org_created_idx
  on public.media_assets (
    organization_id,
    created_at desc
  );

create index if not exists media_assets_org_category_idx
  on public.media_assets (
    organization_id,
    category,
    status
  );

create index if not exists media_asset_links_entity_idx
  on public.media_asset_links (
    organization_id,
    entity_type,
    entity_id,
    sort_order
  );

create unique index if not exists media_asset_links_primary_idx
  on public.media_asset_links (
    organization_id,
    entity_type,
    entity_id,
    role
  )
  where is_primary = true;

alter table public.media_assets
  enable row level security;

alter table public.media_asset_links
  enable row level security;

create policy "Organization members can read media assets"
on public.media_assets
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

create policy "Organization members can insert media assets"
on public.media_assets
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
);

create policy "Organization members can update media assets"
on public.media_assets
for update
to authenticated
using (
  public.is_organization_member(organization_id)
)
with check (
  public.is_organization_member(organization_id)
);

create policy "Organization members can delete media assets"
on public.media_assets
for delete
to authenticated
using (
  public.is_organization_member(organization_id)
);

create policy "Organization members can read media links"
on public.media_asset_links
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

create policy "Organization members can insert media links"
on public.media_asset_links
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
);

create policy "Organization members can update media links"
on public.media_asset_links
for update
to authenticated
using (
  public.is_organization_member(organization_id)
)
with check (
  public.is_organization_member(organization_id)
);

create policy "Organization members can delete media links"
on public.media_asset_links
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
  'media-center',
  'media-center',
  false,
  524288000,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
