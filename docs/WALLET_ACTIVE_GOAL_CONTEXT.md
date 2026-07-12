# Wallet Active Goal Context

Stand: 2026-07-03

Diese Datei nimmt den nachgereichten Nutzerkontext ausdrücklich in das aktive Wallet-Goal auf. Sie ist kein Secret Store und enthält keine echten privaten Werte. Echte Keys, Zertifikate, Service Accounts und URLs gehören in `config.json`, `supabase/secrets.local.env` oder direkt in Supabase Secrets.

## 1. Verwendetes Frontend-Framework

Projektentscheid:

- Kein React.
- Kein Vite.
- Kein Next.js.
- Kein anderes Frontend-Framework.
- Frontend bleibt HTML, CSS und Vanilla JavaScript.

Relevante Dateien:

- `public/*.html`
- `public/styles.css`
- `public/js/*.js`
- `package.json`

## 2. Aktuelle Supabase Tabellen

Aktive Kern-Tabellen:

- `operator_profiles`
- Supabase `auth.users`
- `businesses`
- `card_templates`
- `customer_cards`
- `card_instances`
- `card_events`
- `scan_events`
- `balance_transactions`
- `topup_payment_sessions`
- `wallet_update_jobs`
- `wallet_device_registrations`

Aktive direkte Wallet-Tabellen:

- `apple_wallet_devices`
- `apple_wallet_registrations`
- `apple_pass_versions`
- `google_wallet_objects`
- `wallet_notification_campaigns`
- `wallet_notification_recipients`
- `wallet_push_logs`
- `wallet_update_queue`

Mapping zu den vom Nutzer genannten Namen:

- `profiles` wird im Projekt als `operator_profiles` geführt.
- `users` liegt bei Supabase Auth als `auth.users`.
- `scan_events` ist eine eigene Statistik-Tabelle für Scanner-Besuche; `card_events` bleibt der allgemeine Audit-/Wallet-Event-Log.

## 3. Apple Developer Daten

Diese Werte sind Teil des aktiven Goals und dürfen nur serverseitig verwendet werden:

- Team ID: `APPLE_TEAM_ID`
- Pass Type ID: `APPLE_PASS_TYPE_ID`
- Pass Certificate: `APPLE_PASS_CERT`
- WWDR Certificate: `APPLE_WWDR_CERT`
- Private Key: `APPLE_PASS_KEY`
- Key Passwort: `APPLE_PASS_KEY_PASSWORD`
- APNs Key ID: `APPLE_APNS_KEY_ID`
- APNs Auth Key: `APPLE_APNS_AUTH_KEY`

Zusätzlich benötigt:

- `APPLE_WEB_SERVICE_BASE_URL`
- `APPLE_APNS_TEAM_ID`

Lokale Dateivorbereitung liegt im Ordner `certs/`; produktiv werden die Inhalte als Supabase Secrets gesetzt.

## 4. Google Wallet Daten

Diese Werte sind Teil des aktiven Goals und dürfen nur serverseitig verwendet werden:

- Issuer ID: `GOOGLE_WALLET_ISSUER_ID`
- Service Account JSON: `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`

Gewünschte Pass-Typen:

- Generic
- Loyalty
- Offer
- Event Ticket
- Gift Card

Technisches Mapping:

- Generic -> `genericObject`
- Loyalty -> `loyaltyObject`
- Offer -> `offerObject`
- Event Ticket -> `eventTicketObject`
- Gift Card -> `giftCardObject` fuer `balance_card`

## 5. Public URLs

Diese URLs müssen lokal und produktiv getrennt gepflegt werden:

- Domain deiner Webapp: `publicUrls.webAppDomain` und `APP_PUBLIC_BASE_URL`
- Supabase Function Base URL: `publicUrls.supabaseFunctionBaseUrl`
- Wallet Installationsseite: `publicUrls.walletInstallPage`
- Apple Wallet Web Service: `APPLE_WEB_SERVICE_BASE_URL`

Lokaler Default:

- Webapp: `http://localhost:3000`
- Wallet-Installationsseite: `http://localhost:3000/claim.html`

Produktiv:

- Webapp und Claim-Seite müssen öffentlich per HTTPS erreichbar sein.
- Apple Web Service muss exakt auf die Supabase Function `apple-wallet-webservice` zeigen, ohne zusätzliches `/v1`.

## 6. Design

Diese Design- und Editorbestandteile gehören zum aktiven Goal:

- Logo-Felder für Karten- und Wallet-Assets.
- Kartenvorschau-Komponenten im Editor.
- Vorhandene Template-Typen und deren Feature-Matrix.
- Bestehende QR/PDF-Komponenten.
- Supabase Storage Uploads für Wallet-Assets.

Relevante Dateien:

- `public/js/editor.js`
- `public/js/ui.js`
- `public/js/templateFeatures.js`
- `server/pdf.js`
- `supabase/functions/generate-card-pdf/index.ts`

## 7. Versandregeln

Diese Versandregeln gehören zum aktiven Goal und müssen serverseitig validiert werden:

- Max. Nachrichten pro Kunde/Tag: `WALLET_CUSTOMER_DAILY_LIMIT`
- Max. Nachrichten pro Karte/Tag: `WALLET_CARD_DAILY_LIMIT`
- Max. Nachrichten pro Business/Tag: `WALLET_BUSINESS_DAILY_LIMIT`
- Google `TEXT_AND_NOTIFY` Limit pro Pass/24h: `WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H`
- Deduplizierung gleicher Nachrichten: `WALLET_DUPLICATE_WINDOW_MINUTES`
- Standardtexte: `deliveryRules.defaultTitle` und `deliveryRules.defaultMessage`
- Erlaubte Zielgruppen: `deliveryRules.allowedTargets`

Erlaubte Zielgruppen im MVP:

- `all_active`
- `template`
- `platform_apple`
- `platform_google`
- `stamp_count`
- `streak_count`
- `vip_level`
- `balance_range`
- `cloakroom_open`
- `event`
- `coupon_unredeemed`
- `membership_status`

Regel:

- Frontend-Ausblendung ist nur Komfort.
- Edge Functions, SQL-Checks und `walletNotificationService` bleiben die autoritative Validierung.
- Das Kundenlimit gruppiert über `card_instances.customer_id`, sobald vorhanden, sonst über `customer_card_id`.
