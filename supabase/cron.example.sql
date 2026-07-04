-- Supabase Cron Vorlage für Wallet-Benachrichtigungen und Wallet-Update-Queue.
--
-- Vor dem Ausführen im Supabase SQL Editor ersetzen:
--   YOUR_PROJECT_REF
--   YOUR_WALLET_CRON_SECRET
--
-- Der Secret-Wert muss identisch mit dem Supabase Edge Secret WALLET_CRON_SECRET sein:
--   supabase secrets set WALLET_CRON_SECRET="..."
--
-- Danach können fällige Kampagnen und Queue-Jobs regelmässig verarbeitet
-- werden. Diese Datei enthält bewusst keine echten Secrets.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if position('YOUR_' in 'YOUR_PROJECT_REF') > 0 then
    raise exception 'Bitte YOUR_PROJECT_REF durch die Supabase Project Ref ersetzen.';
  end if;
end $$;

do $$
begin
  if position('YOUR_' in 'YOUR_WALLET_CRON_SECRET') > 0 then
    raise exception 'Bitte YOUR_WALLET_CRON_SECRET durch den Wert von WALLET_CRON_SECRET ersetzen.';
  end if;
end $$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'wallet-process-scheduled-notifications') then
    perform cron.unschedule('wallet-process-scheduled-notifications');
  end if;

  if exists (select 1 from cron.job where jobname = 'wallet-process-update-queue') then
    perform cron.unschedule('wallet-process-update-queue');
  end if;
end $$;

select cron.schedule(
  'wallet-process-scheduled-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-scheduled-wallet-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_WALLET_CRON_SECRET'
    ),
    body := jsonb_build_object('source', 'supabase-cron')
  );
  $$
);

select cron.schedule(
  'wallet-process-update-queue',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-wallet-update-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_WALLET_CRON_SECRET'
    ),
    body := jsonb_build_object('source', 'supabase-cron')
  );
  $$
);

-- Kontrolle: bewusst ohne command-Spalte, weil dort Header-Werte stehen.
select jobid, jobname, schedule, active
from cron.job
where jobname in (
  'wallet-process-scheduled-notifications',
  'wallet-process-update-queue'
)
order by jobname;
