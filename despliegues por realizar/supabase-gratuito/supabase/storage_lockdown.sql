-- Current architecture uses Supabase for new files. Use storage_setup.sql.
-- This file only inspects policies; it no longer assumes migration to Firebase Storage.
select policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='storage' and tablename='objects';
