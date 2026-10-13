-- Review in Supabase after confirming all new clients upload through Firebase Storage.
-- Keeps existing public image URLs readable. Does not delete files.
drop policy if exists "Clients can upload property images" on storage.objects;
-- Inspect other policies before applying: another permissive INSERT policy could still grant access.
select policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects';
