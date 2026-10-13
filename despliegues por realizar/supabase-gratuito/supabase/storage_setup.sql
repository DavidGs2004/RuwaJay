-- Apply only in the RuwaJay Supabase project after deploying the compatible API/clients.
-- Uploads and private downloads are authorized by the Edge Function against Firebase.
-- Never expose the service role key in web or Android.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('property-images','property-images',true,8388608,array['image/jpeg','image/png','image/webp']),
 ('profile-images','profile-images',true,8388608,array['image/jpeg','image/png','image/webp']),
 ('chat-media','chat-media',false,20971520,array['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','video/webm']),
 ('verification','verification',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Restrictive policies also constrain unknown permissive policies for these buckets.
drop policy if exists "RuwaJay server uploads only" on storage.objects;
create policy "RuwaJay server uploads only" on storage.objects as restrictive
 for insert to anon,authenticated with check(bucket_id not in ('property-images','profile-images','chat-media','verification'));
drop policy if exists "RuwaJay server updates only" on storage.objects;
create policy "RuwaJay server updates only" on storage.objects as restrictive
 for update to anon,authenticated using(bucket_id not in ('property-images','profile-images','chat-media','verification')) with check(bucket_id not in ('property-images','profile-images','chat-media','verification'));
drop policy if exists "RuwaJay server deletes only" on storage.objects;
create policy "RuwaJay server deletes only" on storage.objects as restrictive
 for delete to anon,authenticated using(bucket_id not in ('property-images','profile-images','chat-media','verification'));
drop policy if exists "RuwaJay private reads through server" on storage.objects;
create policy "RuwaJay private reads through server" on storage.objects as restrictive
 for select to anon,authenticated using(bucket_id not in ('chat-media','verification'));
-- Old public property URLs stay accessible; anonymous uploads are now blocked.
drop policy if exists "Clients can upload property images" on storage.objects;
commit;
