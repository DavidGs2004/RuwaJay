-- First store ruwajay_api_url and ruwajay_cron_secret in Supabase Vault.
-- API URL ends in /functions/v1/ruwajay-api. Secret matches RUWA_CRON_SECRET.
-- Neither value belongs in committed SQL. All secrets remain server-side.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('ruwajay-maintenance','*/5 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='ruwajay_api_url') || '/scheduled',
    headers := jsonb_build_object('Content-Type','application/json','x-ruwa-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='ruwajay_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
