-- Run once in Supabase Dashboard > SQL Editor.
-- Images are public; uploads use the public anon key from the web and Android apps.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view property images" on storage.objects;
create policy "Public can view property images"
on storage.objects for select
to public
using (bucket_id = 'property-images');

drop policy if exists "Clients can upload property images" on storage.objects;
create policy "Clients can upload property images"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = 'properties'
);

