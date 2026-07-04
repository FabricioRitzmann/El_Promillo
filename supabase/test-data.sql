-- Optional test data for El_Promillo.
--
-- Usage:
-- 1. Register a real operator in the app, for example demo@example.com.
-- 2. Run supabase/schema.sql first.
-- 3. Adjust demo_operator_email below if needed.
-- 4. Run this file in the Supabase SQL Editor.

do $$
declare
  demo_operator_email text := 'demo@example.com';
  demo_owner_id uuid;
  demo_business_id uuid;
  stamp_template_id uuid := '11111111-1111-4111-8111-111111111111';
  vip_template_id uuid := '22222222-2222-4222-8222-222222222222';
  balance_template_id uuid := '33333333-3333-4333-8333-333333333333';
  cloakroom_template_id uuid := '44444444-4444-4444-8444-444444444444';
  event_template_id uuid := '55555555-5555-4555-8555-555555555555';
  coupon_template_id uuid := '66666666-6666-4666-8666-666666666666';
  club_base_template_id uuid := '77777777-7777-4777-8777-777777777771';
  club_vip_template_id uuid := '77777777-7777-4777-8777-777777777772';
  club_balance_template_id uuid := '77777777-7777-4777-8777-777777777773';
  club_cloakroom_template_id uuid := '77777777-7777-4777-8777-777777777774';
  club_coupon_template_id uuid := '77777777-7777-4777-8777-777777777775';
  club_membership_template_id uuid := '77777777-7777-4777-8777-777777777776';
  club_all_template_id uuid := '77777777-7777-4777-8777-777777777777';
  apple_card_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  google_card_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  balance_card_id uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  cloakroom_card_id uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  event_card_id uuid := 'eeeeeeee-1111-4eee-8eee-111111111111';
  coupon_card_id uuid := '12121212-1212-4121-8121-121212121212';
  club_base_card_id uuid := '77777771-7777-4777-8777-777777777771';
  club_vip_card_id uuid := '77777772-7777-4777-8777-777777777772';
  club_balance_card_id uuid := '77777773-7777-4777-8777-777777777773';
  club_cloakroom_card_id uuid := '77777774-7777-4777-8777-777777777774';
  club_coupon_card_id uuid := '77777775-7777-4777-8777-777777777775';
  club_membership_card_id uuid := '77777776-7777-4777-8777-777777777776';
  club_all_card_id uuid := '77777770-7777-4777-8777-777777777777';
  immediate_campaign_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  scheduled_campaign_id uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  cloakroom_campaign_id uuid := '99999999-9999-4999-8999-999999999999';
  demo_device_library_identifier text := 'demo-device-library-identifier';
  demo_pass_type_identifier text := 'pass.com.example.walletcards';
begin
  select id
  into demo_owner_id
  from public.operator_profiles
  where email = demo_operator_email
  limit 1;

  if demo_owner_id is null then
    raise notice 'No operator profile found for %. Register this user first or change demo_operator_email.', demo_operator_email;
    return;
  end if;

  update public.operator_profiles
  set unlock = true
  where id = demo_owner_id;

  insert into public.businesses (owner_id, name, description, website)
  values (demo_owner_id, 'Demo Cafe', 'Demo-Business für Wallet-Tests', 'https://example.com')
  on conflict (owner_id) do update
  set
    name = excluded.name,
    description = excluded.description,
    website = excluded.website
  returning id into demo_business_id;

  insert into public.card_templates (
    id,
    owner_id,
    business_id,
    business_name,
    card_name,
    card_type,
    template_type,
    description,
    primary_color,
    text_color,
    reward_text,
    stamps_required,
    settings
  )
  values
    (
      stamp_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Cafe',
      'Demo Stempelkarte',
      'stamp',
      'stamp_card',
      '10 Kaffees sammeln',
      '#164e63',
      '#ffffff',
      'Gratis Kaffee freigeschaltet',
      10,
      '{"notificationsEnabled": true, "stampIconUrl": ""}'::jsonb
    ),
    (
      vip_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Cafe',
      'Demo VIP Karte',
      'vip',
      'vip_card',
      'VIP-Vorteile testen',
      '#3f3f46',
      '#ffffff',
      'VIP Vorteil verfügbar',
      10,
      '{"notificationsEnabled": true, "vipLevelNames": "Bronze, Silber, Gold"}'::jsonb
    ),
    (
      balance_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Cafe',
      'Demo Guthabenkarte',
      'generic',
      'balance_card',
      'Guthaben testen',
      '#0f766e',
      '#ffffff',
      null,
      10,
      '{"notificationsEnabled": true, "currency": "CHF", "minTopupCents": 500, "maxTopupCents": 20000}'::jsonb
    ),
    (
      cloakroom_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Garderobenkarte',
      'generic',
      'cloakroom_card',
      'Garderoben-Erinnerungen testen',
      '#4c1d95',
      '#ffffff',
      null,
      10,
      '{"notificationsEnabled": true, "cloakroomNoonMessage": "Bitte Garderobe abholen.", "cloakroomLocationMessage": "Du bist wieder in der Nähe deiner Garderobe.", "cloakroomLocationLatitude": 47.376887, "cloakroomLocationLongitude": 8.541694, "cloakroomLocationRadiusMeters": 150}'::jsonb
    ),
    (
      event_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Eventkarte',
      'generic',
      'event_card',
      'Event-Ticket für Google Wallet testen',
      '#1f2937',
      '#ffffff',
      'Willkommen beim Demo Event',
      10,
      '{"notificationsEnabled": true, "eventName": "Demo Night", "eventDate": "2026-09-12", "eventStartTime": "20:00", "eventEndTime": "23:30", "eventLocation": "Demo Club Zürich", "eventBackgroundImageUrl": ""}'::jsonb
    ),
    (
      coupon_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Cafe',
      'Demo Couponkarte',
      'generic',
      'coupon_card',
      'Google Offer / Coupon testen',
      '#92400e',
      '#ffffff',
      'Coupon einlösen',
      10,
      '{"notificationsEnabled": true, "couponTitle": "Demo Coupon", "discountValue": "20%", "couponProvider": "Demo Cafe", "couponDetails": "20% auf ein Heissgetränk", "redemptionTerms": "Einmalig einlösbar.", "couponValidUntil": "2026-12-31"}'::jsonb
    )
  on conflict (id) do update
  set
    business_id = excluded.business_id,
    card_name = excluded.card_name,
    description = excluded.description,
    primary_color = excluded.primary_color,
    text_color = excluded.text_color,
    reward_text = excluded.reward_text,
    settings = excluded.settings,
    updated_at = now();

  insert into public.card_templates (
    id,
    owner_id,
    business_id,
    business_name,
    card_name,
    card_type,
    template_type,
    description,
    primary_color,
    text_color,
    reward_text,
    stamps_required,
    vip_tier,
    settings,
    club_features,
    club_settings
  )
  values
    (
      club_base_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Clubkarte Basis',
      'generic',
      'club_card',
      'Clubkarte ohne Zusatzfeatures',
      '#111827',
      '#ffffff',
      null,
      10,
      null,
      '{"notificationsEnabled": true, "customFieldsText": "Basisdaten"}'::jsonb,
      '{"vip": false, "balance": false, "cloakroom": false, "coupon": false, "membership": false}'::jsonb,
      '{}'::jsonb
    ),
    (
      club_vip_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Clubkarte VIP',
      'generic',
      'club_card',
      'Clubkarte mit VIP-Modul',
      '#312e81',
      '#ffffff',
      'VIP Vorteil verfügbar',
      10,
      'Gold',
      '{"notificationsEnabled": true, "vipLevelNames": "Bronze, Silber, Gold, Platin", "vipNote": "Welcome Drink"}'::jsonb,
      '{"vip": true, "balance": false, "cloakroom": false, "coupon": false, "membership": false}'::jsonb,
      '{"testCase": "B"}'::jsonb
    ),
    (
      club_balance_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Clubkarte Guthaben',
      'generic',
      'club_card',
      'Clubkarte mit Guthaben-Modul',
      '#0f766e',
      '#ffffff',
      null,
      10,
      null,
      '{"notificationsEnabled": true, "currency": "CHF", "minTopupCents": 500, "maxTopupCents": 20000}'::jsonb,
      '{"vip": false, "balance": true, "cloakroom": false, "coupon": false, "membership": false}'::jsonb,
      '{"testCase": "C"}'::jsonb
    ),
    (
      club_cloakroom_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Clubkarte Garderobe',
      'generic',
      'club_card',
      'Clubkarte mit Garderoben-Modul',
      '#4c1d95',
      '#ffffff',
      null,
      10,
      null,
      '{"notificationsEnabled": true, "cloakroomNoonMessage": "Bitte Garderobe abholen.", "cloakroomLocationMessage": "Du bist wieder in der Nähe deiner Garderobe.", "cloakroomLocationLatitude": 47.376887, "cloakroomLocationLongitude": 8.541694, "cloakroomLocationRadiusMeters": 150}'::jsonb,
      '{"vip": false, "balance": false, "cloakroom": true, "coupon": false, "membership": false}'::jsonb,
      '{"testCase": "D"}'::jsonb
    ),
    (
      club_coupon_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Clubkarte Coupon',
      'generic',
      'club_card',
      'Clubkarte mit Coupon-Modul',
      '#92400e',
      '#ffffff',
      'Coupon einlösen',
      10,
      null,
      '{"notificationsEnabled": true, "couponTitle": "Club Coupon", "discountValue": "20%", "redemptionTerms": "Einmalig einlösbar.", "couponValidUntil": "2026-12-31"}'::jsonb,
      '{"vip": false, "balance": false, "cloakroom": false, "coupon": true, "membership": false}'::jsonb,
      '{"testCase": "E"}'::jsonb
    ),
    (
      club_membership_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Clubkarte Mitgliedschaft',
      'generic',
      'club_card',
      'Clubkarte mit Mitgliedschafts-Modul',
      '#0f172a',
      '#ffffff',
      'Mitgliedschaft aktiv',
      10,
      null,
      '{"notificationsEnabled": true, "membershipStatus": "active", "membershipBenefits": "Lounge Zugang", "membershipExpiresAt": "2026-12-31"}'::jsonb,
      '{"vip": false, "balance": false, "cloakroom": false, "coupon": false, "membership": true}'::jsonb,
      '{"testCase": "F"}'::jsonb
    ),
    (
      club_all_template_id,
      demo_owner_id,
      demo_business_id,
      'Demo Club',
      'Demo Clubkarte Alle Features',
      'generic',
      'club_card',
      'Clubkarte mit VIP, Guthaben, Garderobe, Coupon und Mitgliedschaft',
      '#1f2937',
      '#ffffff',
      'Alle Clubvorteile aktiv',
      10,
      'Gold',
      '{"notificationsEnabled": true, "currency": "CHF", "vipLevelNames": "Bronze, Silber, Gold, Platin", "couponTitle": "All-in Coupon", "discountValue": "20%", "membershipStatus": "active", "membershipBenefits": "Alle Vorteile", "membershipExpiresAt": "2026-12-31", "cloakroomNoonMessage": "Bitte Garderobe abholen."}'::jsonb,
      '{"vip": true, "balance": true, "cloakroom": true, "coupon": true, "membership": true}'::jsonb,
      '{"testCase": "G"}'::jsonb
    )
  on conflict (id) do update
  set
    business_id = excluded.business_id,
    card_name = excluded.card_name,
    description = excluded.description,
    primary_color = excluded.primary_color,
    text_color = excluded.text_color,
    reward_text = excluded.reward_text,
    vip_tier = excluded.vip_tier,
    settings = excluded.settings,
    club_features = excluded.club_features,
    club_settings = excluded.club_settings,
    updated_at = now();

  insert into public.customer_cards (
    id,
    owner_id,
    business_id,
    template_id,
    card_instance_number,
    customer_code,
    stamp_count,
    streak_count,
    vip_status,
    pass_serial_number,
    pass_authentication_token,
    wallet_platform,
    wallet_object_id,
    wallet_serial_number,
    balance_cents,
    currency,
    cloakroom_active,
    metadata
  )
  values
    (
      apple_card_id,
      demo_owner_id,
      demo_business_id,
      stamp_template_id,
      'CI-DEMO-APPLE',
      'WC-DEMO-APPLE',
      4,
      0,
      null,
      'serial-demo-apple',
      'demo-apple-auth-token',
      'apple',
      null,
      'serial-demo-apple',
      0,
      'CHF',
      false,
      '{"demo": true}'::jsonb
    ),
    (
      google_card_id,
      demo_owner_id,
      demo_business_id,
      vip_template_id,
      'CI-DEMO-GOOGLE',
      'WC-DEMO-GOOGLE',
      0,
      0,
      'Gold',
      null,
      null,
      'google',
      'issuer.demo_google_object',
      'issuer.demo_google_object',
      0,
      'CHF',
      false,
      '{"demo": true}'::jsonb
    ),
    (
      balance_card_id,
      demo_owner_id,
      demo_business_id,
      balance_template_id,
      'CI-DEMO-BALANCE',
      'WC-DEMO-BALANCE',
      0,
      0,
      null,
      null,
      null,
      'google',
      'issuer.demo_balance_object',
      'issuer.demo_balance_object',
      2500,
      'CHF',
      false,
      '{"demo": true}'::jsonb
    ),
    (
      cloakroom_card_id,
      demo_owner_id,
      demo_business_id,
      cloakroom_template_id,
      'CI-DEMO-CLOAK',
      'WC-DEMO-CLOAK',
      0,
      0,
      null,
      'serial-demo-cloak',
      'demo-cloak-auth-token',
      'apple',
      null,
      'serial-demo-cloak',
      0,
      'CHF',
      true,
      '{"demo": true}'::jsonb
    ),
    (
      event_card_id,
      demo_owner_id,
      demo_business_id,
      event_template_id,
      'CI-DEMO-EVENT',
      'WC-DEMO-EVENT',
      0,
      0,
      null,
      null,
      null,
      'google',
      'issuer.demo_event_object',
      'issuer.demo_event_object',
      0,
      'CHF',
      false,
      '{"demo": true, "ticket_number": "EVT-1001", "ticket_holder_name": "Demo Gast", "ticket_type": "Standard", "section": "Main", "row": "A", "seat": "12", "gate": "Nord"}'::jsonb
    ),
    (
      coupon_card_id,
      demo_owner_id,
      demo_business_id,
      coupon_template_id,
      'CI-DEMO-COUPON',
      'WC-DEMO-COUPON',
      0,
      0,
      null,
      null,
      null,
      'google',
      'issuer.demo_coupon_object',
      'issuer.demo_coupon_object',
      0,
      'CHF',
      false,
      '{"demo": true, "coupon_valid_until": "2026-12-31"}'::jsonb
    )
  on conflict (id) do update
  set
    stamp_count = excluded.stamp_count,
    vip_status = excluded.vip_status,
    wallet_platform = excluded.wallet_platform,
    wallet_object_id = excluded.wallet_object_id,
    wallet_serial_number = excluded.wallet_serial_number,
    balance_cents = excluded.balance_cents,
    cloakroom_active = excluded.cloakroom_active,
    metadata = excluded.metadata,
    updated_at = now();

  insert into public.customer_cards (
    id,
    owner_id,
    business_id,
    template_id,
    card_instance_number,
    customer_code,
    stamp_count,
    streak_count,
    vip_status,
    pass_serial_number,
    pass_authentication_token,
    wallet_platform,
    wallet_object_id,
    wallet_serial_number,
    balance_cents,
    currency,
    cloakroom_active,
    metadata
  )
  values
    (
      club_base_card_id,
      demo_owner_id,
      demo_business_id,
      club_base_template_id,
      'CI-DEMO-CLUB-BASE',
      'WC-DEMO-CLUB-BASE',
      0,
      0,
      null,
      'serial-demo-club-base',
      'demo-club-base-auth-token',
      'apple',
      null,
      'serial-demo-club-base',
      0,
      'CHF',
      false,
      '{"demo": true, "club_test_case": "A"}'::jsonb
    ),
    (
      club_vip_card_id,
      demo_owner_id,
      demo_business_id,
      club_vip_template_id,
      'CI-DEMO-CLUB-VIP',
      'WC-DEMO-CLUB-VIP',
      0,
      0,
      'Gold',
      'serial-demo-club-vip',
      'demo-club-vip-auth-token',
      'apple',
      null,
      'serial-demo-club-vip',
      0,
      'CHF',
      false,
      '{"demo": true, "club_test_case": "B", "vip_benefits_used": []}'::jsonb
    ),
    (
      club_balance_card_id,
      demo_owner_id,
      demo_business_id,
      club_balance_template_id,
      'CI-DEMO-CLUB-BALANCE',
      'WC-DEMO-CLUB-BALANCE',
      0,
      0,
      null,
      null,
      null,
      'google',
      'issuer.demo_club_balance_object',
      'issuer.demo_club_balance_object',
      5000,
      'CHF',
      false,
      '{"demo": true, "club_test_case": "C", "balance_cents": 5000}'::jsonb
    ),
    (
      club_cloakroom_card_id,
      demo_owner_id,
      demo_business_id,
      club_cloakroom_template_id,
      'CI-DEMO-CLUB-CLOAK',
      'WC-DEMO-CLUB-CLOAK',
      0,
      0,
      null,
      'serial-demo-club-cloak',
      'demo-club-cloak-auth-token',
      'apple',
      null,
      'serial-demo-club-cloak',
      0,
      'CHF',
      false,
      '{"demo": true, "club_test_case": "D", "cloakroom_active": false}'::jsonb
    ),
    (
      club_coupon_card_id,
      demo_owner_id,
      demo_business_id,
      club_coupon_template_id,
      'CI-DEMO-CLUB-COUPON',
      'WC-DEMO-CLUB-COUPON',
      0,
      0,
      null,
      null,
      null,
      'google',
      'issuer.demo_club_coupon_object',
      'issuer.demo_club_coupon_object',
      0,
      'CHF',
      false,
      '{"demo": true, "club_test_case": "E", "coupon_status": "unused"}'::jsonb
    ),
    (
      club_membership_card_id,
      demo_owner_id,
      demo_business_id,
      club_membership_template_id,
      'CI-DEMO-CLUB-MEMBER',
      'WC-DEMO-CLUB-MEMBER',
      0,
      0,
      null,
      'serial-demo-club-member',
      'demo-club-member-auth-token',
      'apple',
      null,
      'serial-demo-club-member',
      0,
      'CHF',
      false,
      '{"demo": true, "club_test_case": "F", "membership_number": "M-DEMO-100", "membership_status": "active", "membership_expires_at": "2026-12-31"}'::jsonb
    ),
    (
      club_all_card_id,
      demo_owner_id,
      demo_business_id,
      club_all_template_id,
      'CI-DEMO-CLUB-ALL',
      'WC-DEMO-CLUB-ALL',
      0,
      0,
      'Gold',
      'serial-demo-club-all',
      'demo-club-all-auth-token',
      'apple',
      null,
      'serial-demo-club-all',
      5000,
      'CHF',
      true,
      '{"demo": true, "club_test_case": "G", "balance_cents": 5000, "coupon_status": "unused", "membership_number": "M-DEMO-999", "membership_status": "active", "membership_expires_at": "2026-12-31", "cloakroom_active": true}'::jsonb
    )
  on conflict (id) do update
  set
    stamp_count = excluded.stamp_count,
    vip_status = excluded.vip_status,
    wallet_platform = excluded.wallet_platform,
    wallet_object_id = excluded.wallet_object_id,
    wallet_serial_number = excluded.wallet_serial_number,
    balance_cents = excluded.balance_cents,
    currency = excluded.currency,
    cloakroom_active = excluded.cloakroom_active,
    metadata = excluded.metadata,
    updated_at = now();

  insert into public.card_instances (
    id,
    customer_card_id,
    owner_id,
    business_id,
    template_id,
    card_instance_number,
    wallet_platform,
    wallet_object_id,
    wallet_serial_number,
    apple_serial_number,
    google_object_id,
    push_enabled,
    current_stamps,
    current_streak,
    vip_level,
    balance_cents,
    currency,
    cloakroom_active,
    cloakroom_started_at
  )
  select
    c.id,
    c.id,
    c.owner_id,
    c.business_id,
    c.template_id,
    c.card_instance_number,
    c.wallet_platform,
    c.wallet_object_id,
    c.wallet_serial_number,
    case when c.wallet_platform = 'apple' then c.pass_serial_number else null end,
    case when c.wallet_platform = 'google' then c.wallet_object_id else null end,
    true,
    c.stamp_count,
    c.streak_count,
    c.vip_status,
    c.balance_cents,
    c.currency,
    c.cloakroom_active,
    case when c.cloakroom_active then now() - interval '2 hours' else null end
  from public.customer_cards c
  where c.id in (
    apple_card_id,
    google_card_id,
    balance_card_id,
    cloakroom_card_id,
    event_card_id,
    coupon_card_id,
    club_base_card_id,
    club_vip_card_id,
    club_balance_card_id,
    club_cloakroom_card_id,
    club_coupon_card_id,
    club_membership_card_id,
    club_all_card_id
  )
  on conflict (id) do update
  set
    wallet_platform = excluded.wallet_platform,
    wallet_object_id = excluded.wallet_object_id,
    wallet_serial_number = excluded.wallet_serial_number,
    apple_serial_number = excluded.apple_serial_number,
    google_object_id = excluded.google_object_id,
    push_enabled = true,
    current_stamps = excluded.current_stamps,
    current_streak = excluded.current_streak,
    vip_level = excluded.vip_level,
    balance_cents = excluded.balance_cents,
    currency = excluded.currency,
    cloakroom_active = excluded.cloakroom_active,
    cloakroom_started_at = excluded.cloakroom_started_at,
    updated_at = now();

  update public.card_instances
  set
    vip_benefits_used = coalesce(customer_cards.metadata->'vip_benefits_used', '[]'::jsonb),
    coupon_status = coalesce(customer_cards.metadata->>'coupon_status', 'unused'),
    coupon_redeemed_at = null,
    membership_number = customer_cards.metadata->>'membership_number',
    membership_status = coalesce(customer_cards.metadata->>'membership_status', 'active'),
    membership_started_at = case
      when customer_cards.metadata ? 'membership_status' then now() - interval '30 days'
      else null
    end,
    membership_expires_at = nullif(customer_cards.metadata->>'membership_expires_at', '')::timestamptz
  from public.customer_cards
  where public.card_instances.customer_card_id = customer_cards.id
    and customer_cards.id in (
      club_vip_card_id,
      club_coupon_card_id,
      club_membership_card_id,
      club_all_card_id
    );

  update public.card_instances
  set
    demographics_collected = true,
    customer_gender = case id
      when google_card_id then 'male'
      when balance_card_id then 'male'
      when cloakroom_card_id then 'female'
      when event_card_id then 'female'
      when coupon_card_id then 'male'
      when club_vip_card_id then 'female'
      when club_balance_card_id then 'male'
      when club_cloakroom_card_id then 'female'
      when club_coupon_card_id then 'female'
      when club_membership_card_id then 'male'
      when club_all_card_id then 'male'
      else customer_gender
    end,
    customer_age_group = case id
      when google_card_id then '18_plus'
      when balance_card_id then '25_plus'
      when cloakroom_card_id then '30_plus'
      when event_card_id then '18_plus'
      when coupon_card_id then '30_plus'
      when club_vip_card_id then '25_plus'
      when club_balance_card_id then '25_plus'
      when club_cloakroom_card_id then '25_plus'
      when club_coupon_card_id then '30_plus'
      when club_membership_card_id then '18_plus'
      when club_all_card_id then '30_plus'
      else customer_age_group
    end,
    demographics_collected_at = now() - interval '5 days',
    demographics_collected_by = demo_owner_id,
    first_scanned_at = now() - interval '5 days',
    last_scanned_at = now() - interval '1 hour',
    scan_count = case when id = club_all_card_id then 2 else 1 end
  where id in (
    google_card_id,
    balance_card_id,
    cloakroom_card_id,
    event_card_id,
    coupon_card_id,
    club_vip_card_id,
    club_balance_card_id,
    club_cloakroom_card_id,
    club_coupon_card_id,
    club_membership_card_id,
    club_all_card_id
  );

  insert into public.scan_events (
    id,
    owner_id,
    business_id,
    template_id,
    customer_card_id,
    card_instance_id,
    card_instance_number,
    template_name,
    scanned_by,
    scanned_at,
    scan_hour,
    scan_weekday,
    template_type,
    active_club_features,
    customer_gender,
    customer_age_group,
    is_first_scan,
    demographics_were_collected,
    action_type,
    action_label,
    details
  )
  values
    ('90000000-0000-4000-8000-000000000001', demo_owner_id, demo_business_id, vip_template_id, google_card_id, google_card_id, 'CI-DEMO-GOOGLE', 'Demo VIP Karte', demo_owner_id, now() - interval '6 days' + interval '10 hours', 10, 1, 'vip_card', '{}'::jsonb, 'male', '18_plus', true, true, 'vip-update', 'VIP-Aktion', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000002', demo_owner_id, demo_business_id, balance_template_id, balance_card_id, balance_card_id, 'CI-DEMO-BALANCE', 'Demo Guthabenkarte', demo_owner_id, now() - interval '5 days' + interval '14 hours', 14, 2, 'balance_card', '{}'::jsonb, 'male', '25_plus', true, true, 'balance-redeem', 'Guthaben-Aktion', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000003', demo_owner_id, demo_business_id, cloakroom_template_id, cloakroom_card_id, cloakroom_card_id, 'CI-DEMO-CLOAK', 'Demo Garderobenkarte', demo_owner_id, now() - interval '4 days' + interval '21 hours', 21, 3, 'cloakroom_card', '{}'::jsonb, 'female', '30_plus', true, true, 'cloakroom-toggle', 'Garderobenabgabe', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000004', demo_owner_id, demo_business_id, event_template_id, event_card_id, event_card_id, 'CI-DEMO-EVENT', 'Demo Eventkarte', demo_owner_id, now() - interval '3 days' + interval '19 hours', 19, 4, 'event_card', '{}'::jsonb, 'female', '18_plus', true, true, 'checkin', 'Event Check-in', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000005', demo_owner_id, demo_business_id, coupon_template_id, coupon_card_id, coupon_card_id, 'CI-DEMO-COUPON', 'Demo Couponkarte', demo_owner_id, now() - interval '2 days' + interval '16 hours', 16, 5, 'coupon_card', '{}'::jsonb, 'male', '30_plus', true, true, 'redeem', 'Coupon eingelöst', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000006', demo_owner_id, demo_business_id, club_vip_template_id, club_vip_card_id, club_vip_card_id, 'CI-DEMO-CLUB-VIP', 'Demo Clubkarte VIP', demo_owner_id, now() - interval '2 days' + interval '18 hours', 18, 5, 'club_card', '{"vip": true, "balance": false, "cloakroom": false, "coupon": false, "membership": false}'::jsonb, 'female', '25_plus', true, true, 'vip-update', 'VIP-Aktion', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000007', demo_owner_id, demo_business_id, club_balance_template_id, club_balance_card_id, club_balance_card_id, 'CI-DEMO-CLUB-BALANCE', 'Demo Clubkarte Guthaben', demo_owner_id, now() - interval '1 day' + interval '12 hours', 12, 6, 'club_card', '{"vip": false, "balance": true, "cloakroom": false, "coupon": false, "membership": false}'::jsonb, 'male', '25_plus', true, true, 'balance-redeem', 'Guthaben-Aktion', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000008', demo_owner_id, demo_business_id, club_cloakroom_template_id, club_cloakroom_card_id, club_cloakroom_card_id, 'CI-DEMO-CLUB-CLOAK', 'Demo Clubkarte Garderobe', demo_owner_id, now() - interval '1 day' + interval '20 hours', 20, 6, 'club_card', '{"vip": false, "balance": false, "cloakroom": true, "coupon": false, "membership": false}'::jsonb, 'female', '25_plus', true, true, 'cloakroom-toggle', 'Garderobenabgabe', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000009', demo_owner_id, demo_business_id, club_coupon_template_id, club_coupon_card_id, club_coupon_card_id, 'CI-DEMO-CLUB-COUPON', 'Demo Clubkarte Coupon', demo_owner_id, now() - interval '12 hours', 12, 7, 'club_card', '{"vip": false, "balance": false, "cloakroom": false, "coupon": true, "membership": false}'::jsonb, 'female', '30_plus', true, true, 'redeem', 'Coupon eingelöst', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000010', demo_owner_id, demo_business_id, club_membership_template_id, club_membership_card_id, club_membership_card_id, 'CI-DEMO-CLUB-MEMBER', 'Demo Clubkarte Mitgliedschaft', demo_owner_id, now() - interval '8 hours', 8, 7, 'club_card', '{"vip": false, "balance": false, "cloakroom": false, "coupon": false, "membership": true}'::jsonb, 'male', '18_plus', true, true, 'membership-check', 'Mitgliedschaft geprüft', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000011', demo_owner_id, demo_business_id, club_all_template_id, club_all_card_id, club_all_card_id, 'CI-DEMO-CLUB-ALL', 'Demo Clubkarte Alle Features', demo_owner_id, now() - interval '6 hours', 6, 7, 'club_card', '{"vip": true, "balance": true, "cloakroom": true, "coupon": true, "membership": true}'::jsonb, 'male', '30_plus', true, true, 'cloakroom-toggle', 'Garderobenabgabe', '{"scan_count": 1}'::jsonb),
    ('90000000-0000-4000-8000-000000000012', demo_owner_id, demo_business_id, club_all_template_id, club_all_card_id, club_all_card_id, 'CI-DEMO-CLUB-ALL', 'Demo Clubkarte Alle Features', demo_owner_id, now() - interval '1 hour', 23, 7, 'club_card', '{"vip": true, "balance": true, "cloakroom": true, "coupon": true, "membership": true}'::jsonb, 'male', '30_plus', false, false, 'balance-redeem', 'Guthaben-Aktion', '{"scan_count": 2}'::jsonb)
  on conflict (id) do update
  set
    owner_id = excluded.owner_id,
    business_id = excluded.business_id,
    template_id = excluded.template_id,
    customer_card_id = excluded.customer_card_id,
    card_instance_id = excluded.card_instance_id,
    card_instance_number = excluded.card_instance_number,
    template_name = excluded.template_name,
    scanned_by = excluded.scanned_by,
    scanned_at = excluded.scanned_at,
    scan_hour = excluded.scan_hour,
    scan_weekday = excluded.scan_weekday,
    template_type = excluded.template_type,
    active_club_features = excluded.active_club_features,
    customer_gender = excluded.customer_gender,
    customer_age_group = excluded.customer_age_group,
    is_first_scan = excluded.is_first_scan,
    demographics_were_collected = excluded.demographics_were_collected,
    action_type = excluded.action_type,
    action_label = excluded.action_label,
    details = excluded.details;

  insert into public.club_card_actions (
    id,
    owner_id,
    business_id,
    template_id,
    card_instance_id,
    scan_event_id,
    feature_type,
    action_type,
    customer_gender,
    customer_age_group,
    scanned_at,
    old_value,
    new_value,
    performed_by
  )
  values
    ('91000000-0000-4000-8000-000000000006', demo_owner_id, demo_business_id, club_vip_template_id, club_vip_card_id, '90000000-0000-4000-8000-000000000006', 'vip', 'update_vip_level', 'female', '25_plus', now() - interval '2 days' + interval '18 hours', '{}'::jsonb, '{"vip_status": "Gold"}'::jsonb, demo_owner_id),
    ('91000000-0000-4000-8000-000000000007', demo_owner_id, demo_business_id, club_balance_template_id, club_balance_card_id, '90000000-0000-4000-8000-000000000007', 'balance', 'redeem_balance', 'male', '25_plus', now() - interval '1 day' + interval '12 hours', '{"balance_cents": 5000}'::jsonb, '{"balance_cents": 4000}'::jsonb, demo_owner_id),
    ('91000000-0000-4000-8000-000000000008', demo_owner_id, demo_business_id, club_cloakroom_template_id, club_cloakroom_card_id, '90000000-0000-4000-8000-000000000008', 'cloakroom', 'cloakroom_dropoff', 'female', '25_plus', now() - interval '1 day' + interval '20 hours', '{"cloakroom_active": false}'::jsonb, '{"cloakroom_active": true}'::jsonb, demo_owner_id),
    ('91000000-0000-4000-8000-000000000009', demo_owner_id, demo_business_id, club_coupon_template_id, club_coupon_card_id, '90000000-0000-4000-8000-000000000009', 'coupon', 'redeem_coupon', 'female', '30_plus', now() - interval '12 hours', '{"coupon_status": "unused"}'::jsonb, '{"coupon_status": "redeemed"}'::jsonb, demo_owner_id),
    ('91000000-0000-4000-8000-000000000010', demo_owner_id, demo_business_id, club_membership_template_id, club_membership_card_id, '90000000-0000-4000-8000-000000000010', 'membership', 'check_membership', 'male', '18_plus', now() - interval '8 hours', '{}'::jsonb, '{"membership_status": "active"}'::jsonb, demo_owner_id),
    ('91000000-0000-4000-8000-000000000012', demo_owner_id, demo_business_id, club_all_template_id, club_all_card_id, '90000000-0000-4000-8000-000000000012', 'balance', 'redeem_balance', 'male', '30_plus', now() - interval '1 hour', '{"balance_cents": 5000}'::jsonb, '{"balance_cents": 4000}'::jsonb, demo_owner_id)
  on conflict (id) do update
  set
    scan_event_id = excluded.scan_event_id,
    customer_gender = excluded.customer_gender,
    customer_age_group = excluded.customer_age_group,
    scanned_at = excluded.scanned_at,
    old_value = excluded.old_value,
    new_value = excluded.new_value,
    performed_by = excluded.performed_by;

  insert into public.apple_pass_versions (
    owner_id,
    business_id,
    template_id,
    card_instance_id,
    serial_number,
    pass_type_identifier,
    pass_json,
    assets,
    version
  )
  values
    (
      demo_owner_id,
      demo_business_id,
      stamp_template_id,
      apple_card_id,
      'serial-demo-apple',
      'pass.com.example.walletcards',
      '{
        "formatVersion": 1,
        "passTypeIdentifier": "pass.com.example.walletcards",
        "serialNumber": "serial-demo-apple",
        "teamIdentifier": "DEMOAPPLETEAM",
        "organizationName": "Demo Cafe",
        "description": "Demo Stempelkarte",
        "backgroundColor": "#164e63",
        "foregroundColor": "#ffffff",
        "labelColor": "#ffffff",
        "authenticationToken": "demo-apple-auth-token",
        "webServiceURL": "https://example.com/functions/v1/apple-wallet-webservice",
        "barcodes": [
          {
            "format": "PKBarcodeFormatQR",
            "message": "WC-DEMO-APPLE",
            "messageEncoding": "iso-8859-1",
            "altText": "WC-DEMO-APPLE"
          }
        ],
        "generic": {
          "headerFields": [
            { "key": "currentProgress", "label": "Stempel", "value": "4/10", "changeMessage": "%@" }
          ],
          "primaryFields": [
            { "key": "cardName", "label": "Demo Cafe", "value": "Demo Stempelkarte" }
          ],
          "secondaryFields": [
            { "key": "cardId", "label": "Karten-ID", "value": "WC-DEMO-APPLE" },
            { "key": "type", "label": "Typ", "value": "Stempelkarte" }
          ],
          "auxiliaryFields": [
            { "key": "reward", "label": "Belohnung", "value": "Gratis Kaffee freigeschaltet", "changeMessage": "%@" }
          ],
          "backFields": [
            { "key": "messageBack", "label": "Letzte Nachricht", "value": "Demo-Pass bereit" },
            { "key": "cardIdBack", "label": "Karten-ID", "value": "WC-DEMO-APPLE" },
            { "key": "stampsBack", "label": "Stempel", "value": "4/10" }
          ]
        }
      }'::jsonb,
      '{}'::jsonb,
      1
    ),
    (
      demo_owner_id,
      demo_business_id,
      cloakroom_template_id,
      cloakroom_card_id,
      'serial-demo-cloak',
      'pass.com.example.walletcards',
      '{
        "formatVersion": 1,
        "passTypeIdentifier": "pass.com.example.walletcards",
        "serialNumber": "serial-demo-cloak",
        "teamIdentifier": "DEMOAPPLETEAM",
        "organizationName": "Demo Club",
        "description": "Demo Garderobenkarte",
        "backgroundColor": "#4c1d95",
        "foregroundColor": "#ffffff",
        "labelColor": "#ffffff",
        "authenticationToken": "demo-cloak-auth-token",
        "webServiceURL": "https://example.com/functions/v1/apple-wallet-webservice",
        "barcodes": [
          {
            "format": "PKBarcodeFormatQR",
            "message": "WC-DEMO-CLOAK",
            "messageEncoding": "iso-8859-1",
            "altText": "WC-DEMO-CLOAK"
          }
        ],
        "locations": [
          {
            "latitude": 47.376887,
            "longitude": 8.541694,
            "relevantText": "Du bist wieder in der Nähe deiner Garderobe."
          }
        ],
        "generic": {
          "headerFields": [
            { "key": "currentProgress", "label": "Garderobe", "value": "Aktiv", "changeMessage": "%@" }
          ],
          "primaryFields": [
            { "key": "cardName", "label": "Demo Club", "value": "Demo Garderobenkarte" }
          ],
          "secondaryFields": [
            { "key": "cardId", "label": "Karten-ID", "value": "WC-DEMO-CLOAK" },
            { "key": "type", "label": "Typ", "value": "Garderobenkarte" }
          ],
          "backFields": [
            { "key": "messageBack", "label": "Letzte Nachricht", "value": "Bitte Garderobe abholen." },
            { "key": "cardIdBack", "label": "Karten-ID", "value": "WC-DEMO-CLOAK" },
            { "key": "cloakroomBack", "label": "Garderobe", "value": "Aktiv" }
          ]
        }
      }'::jsonb,
      '{}'::jsonb,
      1
    )
  on conflict (card_instance_id, version) do update
  set
    pass_type_identifier = excluded.pass_type_identifier,
    serial_number = excluded.serial_number,
    pass_json = excluded.pass_json,
    assets = excluded.assets,
    last_updated_at = now();

  insert into public.google_wallet_objects (
    owner_id,
    card_instance_id,
    business_id,
    template_id,
    issuer_id,
    class_id,
    object_id,
    object_type,
    save_url
  )
  values
    (
      demo_owner_id,
      google_card_id,
      demo_business_id,
      vip_template_id,
      'issuer',
      'issuer.demo_vip_class',
      'issuer.demo_google_object',
      'loyaltyObject',
      'https://pay.google.com/gp/v/save/demo'
    ),
    (
      demo_owner_id,
      balance_card_id,
      demo_business_id,
      balance_template_id,
      'issuer',
      'issuer.demo_balance_class',
      'issuer.demo_balance_object',
      'genericObject',
      'https://pay.google.com/gp/v/save/demo-balance'
    ),
    (
      demo_owner_id,
      event_card_id,
      demo_business_id,
      event_template_id,
      'issuer',
      'issuer.demo_event_class',
      'issuer.demo_event_object',
      'eventTicketObject',
      'https://pay.google.com/gp/v/save/demo-event'
    ),
    (
      demo_owner_id,
      coupon_card_id,
      demo_business_id,
      coupon_template_id,
      'issuer',
      'issuer.demo_coupon_class',
      'issuer.demo_coupon_object',
      'offerObject',
      'https://pay.google.com/gp/v/save/demo-coupon'
    )
  on conflict (card_instance_id) do update
  set
    issuer_id = excluded.issuer_id,
    class_id = excluded.class_id,
    object_id = excluded.object_id,
    object_type = excluded.object_type,
    save_url = excluded.save_url,
    updated_at = now();

  insert into public.apple_wallet_devices (
    device_library_identifier,
    push_token
  )
  values (
    demo_device_library_identifier,
    'demo-apple-push-token'
  )
  on conflict (device_library_identifier) do update
  set
    push_token = excluded.push_token,
    updated_at = now();

  insert into public.apple_wallet_registrations (
    owner_id,
    business_id,
    template_id,
    card_instance_id,
    device_library_identifier,
    pass_type_identifier,
    serial_number,
    authentication_token_hash
  )
  values
    (
      demo_owner_id,
      demo_business_id,
      stamp_template_id,
      apple_card_id,
      demo_device_library_identifier,
      demo_pass_type_identifier,
      'serial-demo-apple',
      encode(digest('demo-apple-auth-token', 'sha256'), 'hex')
    ),
    (
      demo_owner_id,
      demo_business_id,
      cloakroom_template_id,
      cloakroom_card_id,
      demo_device_library_identifier,
      demo_pass_type_identifier,
      'serial-demo-cloak',
      encode(digest('demo-cloak-auth-token', 'sha256'), 'hex')
    )
  on conflict (device_library_identifier, pass_type_identifier, serial_number) do update
  set
    owner_id = excluded.owner_id,
    business_id = excluded.business_id,
    template_id = excluded.template_id,
    card_instance_id = excluded.card_instance_id,
    authentication_token_hash = excluded.authentication_token_hash;

  insert into public.wallet_notification_campaigns (
    id,
    owner_id,
    business_id,
    template_id,
    title,
    message,
    target_type,
    target_filter,
    send_type,
    scheduled_at,
    location_lat,
    location_lng,
    location_radius_m,
    status,
    created_by
  )
  values
    (
      immediate_campaign_id,
      demo_owner_id,
      demo_business_id,
      stamp_template_id,
      'Demo Sofortnachricht',
      'Heute gibt es doppelte Stempel.',
      'template',
      '{}'::jsonb,
      'now',
      null,
      null,
      null,
      null,
      'draft',
      demo_owner_id
    ),
    (
      scheduled_campaign_id,
      demo_owner_id,
      demo_business_id,
      vip_template_id,
      'Demo geplante Nachricht',
      'VIP Abend startet bald.',
      'vip_level',
      '{"vipLevel": "Gold"}'::jsonb,
      'scheduled',
      now() + interval '1 day',
      null,
      null,
      null,
      'scheduled',
      demo_owner_id
    ),
    (
      cloakroom_campaign_id,
      demo_owner_id,
      demo_business_id,
      cloakroom_template_id,
      'Demo Garderoben-Erinnerung',
      'Bitte Garderobe abholen.',
      'cloakroom_open',
      '{}'::jsonb,
      'location_based',
      null,
      47.376887,
      8.541694,
      150,
      'scheduled',
      demo_owner_id
    )
  on conflict (id) do update
  set
    title = excluded.title,
    message = excluded.message,
    target_type = excluded.target_type,
    target_filter = excluded.target_filter,
    send_type = excluded.send_type,
    scheduled_at = excluded.scheduled_at,
    location_lat = excluded.location_lat,
    location_lng = excluded.location_lng,
    location_radius_m = excluded.location_radius_m,
    status = excluded.status,
    updated_at = now();

  insert into public.wallet_notification_recipients (
    owner_id,
    campaign_id,
    business_id,
    card_instance_id,
    wallet_platform,
    status,
    provider_response
  )
  values
    (
      demo_owner_id,
      immediate_campaign_id,
      demo_business_id,
      apple_card_id,
      'apple',
      'pending',
      '{"demo": true, "source": "supabase/test-data.sql"}'::jsonb
    ),
    (
      demo_owner_id,
      scheduled_campaign_id,
      demo_business_id,
      google_card_id,
      'google',
      'pending',
      '{"demo": true, "source": "supabase/test-data.sql"}'::jsonb
    ),
    (
      demo_owner_id,
      cloakroom_campaign_id,
      demo_business_id,
      cloakroom_card_id,
      'apple',
      'pending',
      '{"demo": true, "source": "supabase/test-data.sql"}'::jsonb
    )
  on conflict (campaign_id, card_instance_id, wallet_platform) do update
  set
    owner_id = excluded.owner_id,
    business_id = excluded.business_id,
    status = excluded.status,
    provider_response = excluded.provider_response,
    error_code = null,
    error_message = null,
    processing_started_at = null,
    sent_at = null;

  raise notice 'Demo wallet data prepared for operator % (%).', demo_operator_email, demo_owner_id;
end $$;
