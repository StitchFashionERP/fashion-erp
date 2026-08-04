drop policy if exists
  "Organization members can read Media Center files"
  on storage.objects;

create policy
  "Organization members can read Media Center files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media-center'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);

drop policy if exists
  "Organization members can upload Media Center files"
  on storage.objects;

create policy
  "Organization members can upload Media Center files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media-center'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);

drop policy if exists
  "Organization members can update Media Center files"
  on storage.objects;

create policy
  "Organization members can update Media Center files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media-center'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
)
with check (
  bucket_id = 'media-center'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);

drop policy if exists
  "Organization members can delete Media Center files"
  on storage.objects;

create policy
  "Organization members can delete Media Center files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media-center'
  and public.is_organization_member(
    ((storage.foldername(name))[1])::uuid
  )
);
