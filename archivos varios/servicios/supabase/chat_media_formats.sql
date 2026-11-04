-- If the Edge Function storage credential is stale, configure RUWA_SUPABASE_SERVICE_ROLE_KEY
-- as an Edge Function secret with a valid server role key. Never put this key in VITE variables.
-- Apply to existing installations; only updates the private chat bucket.
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/aac','audio/flac','audio/x-m4a','audio/3gpp','audio/opus','video/webm','video/mp4','video/quicktime','video/3gpp','video/x-matroska','video/ogg'],
    file_size_limit = 20971520
where id = 'chat-media';
