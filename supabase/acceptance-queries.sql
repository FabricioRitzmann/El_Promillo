-- Wallet External Acceptance Queries
--
-- Read-only Nachweisqueries für die produktive Apple-/Google-/Cron-/Payment-Abnahme.
-- Diese Datei enthält keine Secrets und verändert keine Daten.
--
-- Empfohlene Reihenfolge:
--   1. supabase/schema.sql ausführen
--   2. Edge Functions deployen und Secrets setzen
--   3. Apple-/Google-/Payment-/Cron-Aktionen ausführen
--   4. Diese Datei im Supabase SQL Editor ausführen

-- 1. Schema-Basis: alle direkt wallet-relevanten Tabellen müssen existieren.
select
  'schema_tables' as acceptance_check,
  table_name,
  to_regclass('public.' || table_name) is not null as table_exists
from (
  values
    ('operator_profiles'),
    ('businesses'),
    ('card_templates'),
    ('customer_cards'),
    ('card_instances'),
    ('wallet_notification_campaigns'),
    ('wallet_notification_recipients'),
    ('wallet_push_logs'),
    ('wallet_update_queue'),
    ('apple_wallet_devices'),
    ('apple_wallet_registrations'),
    ('apple_pass_versions'),
    ('google_wallet_objects'),
    ('balance_transactions'),
    ('topup_payment_sessions'),
    ('card_events')
) as expected(table_name)
order by table_name;

-- 2. Betreiber-Freischaltung und Mandantenbasis.
select
  'operator_unlock_summary' as acceptance_check,
  count(*) as operators_total,
  count(*) filter (where unlock = true) as unlocked_operators,
  count(*) filter (where unlock = false) as locked_operators
from public.operator_profiles;

select
  'business_template_card_summary' as acceptance_check,
  b.owner_id,
  b.id as business_id,
  b.name as business_name,
  count(distinct t.id) as templates_count,
  count(distinct ci.id) as card_instances_count,
  count(distinct ci.id) filter (where ci.wallet_platform = 'apple') as apple_instances_count,
  count(distinct ci.id) filter (where ci.wallet_platform = 'google') as google_instances_count
from public.businesses b
left join public.card_templates t on t.business_id = b.id and t.owner_id = b.owner_id
left join public.card_instances ci on ci.business_id = b.id and ci.owner_id = b.owner_id
group by b.owner_id, b.id, b.name
order by b.created_at desc
limit 50;

-- 3. Apple Wallet: Installation, Device Registration, Pass-Versionen und Webservice-Felder.
select
  'apple_registrations_latest' as acceptance_check,
  ar.created_at,
  ar.owner_id,
  ar.business_id,
  ar.template_id,
  ar.card_instance_id,
  ar.pass_type_identifier,
  ar.serial_number,
  ar.device_library_identifier,
  length(ar.authentication_token_hash) = 64 as token_hash_sha256,
  ci.wallet_platform,
  ci.apple_serial_number
from public.apple_wallet_registrations ar
join public.card_instances ci on ci.id = ar.card_instance_id
order by ar.created_at desc
limit 25;

select
  'apple_pass_versions_latest' as acceptance_check,
  apv.last_updated_at,
  apv.owner_id,
  apv.business_id,
  apv.template_id,
  apv.card_instance_id,
  apv.version,
  apv.serial_number,
  apv.pass_type_identifier,
  apv.pass_json ? 'webServiceURL' as has_web_service_url,
  apv.pass_json ? 'authenticationToken' as has_authentication_token,
  apv.pass_json ? 'barcodes' as has_barcode_array,
  coalesce(apv.assets, '{}'::jsonb) <> '{}'::jsonb as has_assets
from public.apple_pass_versions apv
order by apv.last_updated_at desc
limit 25;

select
  'apple_wallet_logs_latest' as acceptance_check,
  created_at,
  owner_id,
  business_id,
  card_instance_id,
  action,
  status,
  error_message
from public.wallet_push_logs
where wallet_platform = 'apple'
  and action in (
    'issue_apple_pass',
    'claim_apple_pass',
    'manual_apple_pass_update',
    'manual_apple_push_update',
    'apple_device_registered',
    'apple_device_unregistered',
    'apple_changed_serials_listed',
    'apple_pass_downloaded',
    'apple_pass_not_modified',
    'apple_pass_download_failed'
  )
order by created_at desc
limit 50;

-- 4. Google Wallet: Object-Zuordnung, Save-Link und Message/Fallback-Logs.
select
  'google_wallet_objects_latest' as acceptance_check,
  gwo.updated_at,
  gwo.owner_id,
  gwo.business_id,
  gwo.template_id,
  gwo.card_instance_id,
  gwo.issuer_id,
  gwo.class_id,
  gwo.object_id,
  gwo.object_type,
  gwo.save_url is not null as has_save_url,
  ci.google_object_id,
  ci.wallet_object_id,
  ci.wallet_serial_number
from public.google_wallet_objects gwo
join public.card_instances ci on ci.id = gwo.card_instance_id
order by gwo.updated_at desc
limit 25;

select
  'google_wallet_logs_latest' as acceptance_check,
  created_at,
  owner_id,
  business_id,
  card_instance_id,
  action,
  status,
  error_message
from public.wallet_push_logs
where wallet_platform = 'google'
  and action in (
    'google_wallet_save_link',
    'issue_google_wallet_pass',
    'manual_google_object_update',
    'manual_google_wallet_message',
    'google_text_and_notify',
    'google_object_message_fallback',
    'google_location_object_update'
  )
order by created_at desc
limit 50;

-- 5. Kampagnen, Empfängerstatus und Plattformlimits.
select
  'campaign_summary_latest' as acceptance_check,
  c.created_at,
  c.owner_id,
  c.business_id,
  c.template_id,
  c.id as campaign_id,
  c.send_type,
  c.target_type,
  c.status,
  c.scheduled_at,
  c.sent_at,
  count(r.id) as recipients_count,
  count(r.id) filter (where r.wallet_platform = 'apple') as apple_recipients,
  count(r.id) filter (where r.wallet_platform = 'google') as google_recipients,
  count(r.id) filter (where r.status = 'sent') as sent_count,
  count(r.id) filter (where r.status = 'prepared') as prepared_count,
  count(r.id) filter (where r.status = 'limited') as limited_count,
  count(r.id) filter (where r.status = 'failed') as failed_count,
  count(r.id) filter (where r.status = 'skipped') as skipped_count
from public.wallet_notification_campaigns c
left join public.wallet_notification_recipients r on r.campaign_id = c.id
group by c.created_at, c.owner_id, c.business_id, c.template_id, c.id, c.send_type, c.target_type, c.status, c.scheduled_at, c.sent_at
order by c.created_at desc
limit 25;

select
  'visible_notification_count_check' as acceptance_check,
  ci.owner_id,
  ci.business_id,
  ci.id as card_instance_id,
  ci.wallet_platform,
  ci.notification_count_24h as stored_notification_count_24h,
  count(l.id) filter (
    where l.created_at >= now() - interval '24 hours'
      and l.status = 'sent'
      and l.action in ('manual_apple_push_update', 'google_text_and_notify')
  ) as visible_logs_24h
from public.card_instances ci
left join public.wallet_push_logs l on l.card_instance_id = ci.id
group by ci.owner_id, ci.business_id, ci.id, ci.wallet_platform, ci.notification_count_24h
order by ci.updated_at desc
limit 50;

-- 6. Queue/Cron: vorbereitete Updates und Cron-Jobs.
select
  'wallet_update_queue_summary' as acceptance_check,
  owner_id,
  business_id,
  wallet_platform,
  status,
  count(*) as jobs_count,
  min(created_at) as oldest_created_at,
  max(processed_at) as latest_processed_at
from public.wallet_update_queue
group by owner_id, business_id, wallet_platform, status
order by latest_processed_at desc nulls last, oldest_created_at desc nulls last
limit 50;

-- Diese Query funktioniert nach Ausführen von supabase/cron.example.sql.
select
  'cron_jobs' as acceptance_check,
  jobid,
  jobname,
  schedule,
  active
from cron.job
where jobname in (
  'wallet-process-scheduled-notifications',
  'wallet-process-update-queue'
)
order by jobname;

-- 7. Payment/Topup: pending und bestätigte Topups.
select
  'topup_sessions_latest' as acceptance_check,
  tps.created_at,
  tps.updated_at,
  tps.owner_id,
  tps.business_id,
  tps.customer_card_id,
  tps.card_instance_id,
  tps.amount_cents,
  tps.currency,
  tps.status,
  tps.payment_provider,
  tps.provider_session_id is not null as has_provider_session_id
from public.topup_payment_sessions tps
order by tps.created_at desc
limit 25;

select
  'balance_transactions_latest' as acceptance_check,
  bt.created_at,
  bt.owner_id,
  bt.business_id,
  ci.customer_card_id,
  bt.card_instance_id,
  bt.amount_cents,
  bt.currency,
  bt.type,
  bt.payment_provider,
  bt.payment_reference,
  bt.status,
  bt.details->>'source' as source
from public.balance_transactions bt
join public.card_instances ci on ci.id = bt.card_instance_id
order by bt.created_at desc
limit 25;

-- 8. Business-Isolation: keine Wallet-Nachweise dürfen auf andere Owner/Business-Kontexte zeigen.
select
  'wallet_context_mismatch_check' as acceptance_check,
  mismatch_type,
  count(*) as mismatches
from (
  select 'recipient_card_context' as mismatch_type
  from public.wallet_notification_recipients r
  join public.card_instances ci on ci.id = r.card_instance_id
  where r.owner_id is distinct from ci.owner_id
     or r.business_id is distinct from ci.business_id
     or r.wallet_platform is distinct from ci.wallet_platform
  union all
  select 'apple_registration_card_context' as mismatch_type
  from public.apple_wallet_registrations ar
  join public.card_instances ci on ci.id = ar.card_instance_id
  where ar.owner_id is distinct from ci.owner_id
     or ar.business_id is distinct from ci.business_id
     or ar.template_id is distinct from ci.template_id
  union all
  select 'google_object_card_context' as mismatch_type
  from public.google_wallet_objects gwo
  join public.card_instances ci on ci.id = gwo.card_instance_id
  where gwo.owner_id is distinct from ci.owner_id
     or gwo.business_id is distinct from ci.business_id
     or gwo.template_id is distinct from ci.template_id
  union all
  select 'queue_card_context' as mismatch_type
  from public.wallet_update_queue q
  join public.card_instances ci on ci.id = q.card_instance_id
  where q.owner_id is distinct from ci.owner_id
     or q.business_id is distinct from ci.business_id
     or q.wallet_platform is distinct from ci.wallet_platform
) mismatches
group by mismatch_type
order by mismatch_type;
