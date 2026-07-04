# Wallet Implementation Plan

Stand: 2026-07-03

Diese Datei ist die kompakte Arbeits- und Abnahmeübersicht für das aktive Wallet-Ziel: direkte Apple Wallet Integration, direkte Google Wallet Integration, Wallet-Benachrichtigungen aus dem Editor und keine aktive PassKit-Abhängigkeit. Sie bündelt die vom Prompt geforderten Startpunkte: Analyse, Dateiliste, SQL-Migrationsplan, Edge-Function-Plan, Umsetzungsschritte und externe Secret-/Setup-Checkliste.

## 1. Analyse der bestehenden Dateien

Aktueller Projektstand:

- Frontend: HTML, CSS und Vanilla JavaScript; kein React, kein Vite, kein Next.js.
- Auth und Mandantenfähigkeit: Supabase Auth, `operator_profiles.unlock default false`, `businesses.owner_id`, RLS und Edge-Guards.
- Kartenmodell: `card_templates`, `customer_cards`, `card_instances`, `card_events`, `scan_events`, `balance_transactions`, `topup_payment_sessions`.
- Wallet-Modell: `wallet_notification_campaigns`, `wallet_notification_recipients`, `wallet_push_logs`, `wallet_update_queue`, `apple_wallet_devices`, `apple_wallet_registrations`, `apple_pass_versions`, `google_wallet_objects`.
- Direkter Apple-Pfad: Supabase Edge Functions erzeugen und signieren `.pkpass`, stellen Apple Wallet Web Service Endpunkte bereit, speichern Device Registration und bereiten APNS Pass Updates vor.
- Direkter Google-Pfad: Supabase Edge Functions erzeugen/synchronisieren Google Wallet Classes und Objects, Save-Links, Object Updates und `TEXT_AND_NOTIFY` Messages.
- Gemeinsame Benachrichtigungslogik: `walletNotificationService.createCampaign()`, `resolveRecipients()`, `sendNow()`, `schedule()`, `sendToApplePass()`, `sendToGoogleWallet()`, `logResult()` und `checkPlatformLimits()`.
- Security-Grenze: Supabase Service Role Key, Apple-Zertifikate/APNS-Key und Google Service Account JSON werden nur serverseitig über Supabase Secrets verwendet.
- PassKit: der aktive Pfad verwendet kein `passkit-generator`; Legacy-Routen liefern `LEGACY_PASSKIT_ROUTE_DISABLED`.

## 2. Dateien und Verantwortungen

Frontend:

- `public/editor.html`, `public/js/editor.js`: Karteneditor, Wallet-Benachrichtigungen, Zielgruppen, Preflight, Historie.
- `public/dashboard.html`, `public/js/dashboard.js`: Kartenübersicht, Kundenkartenübersicht und Besucherstatistik aus `scan_events`.
- `public/claim.html`, `public/js/claim.js`: mobile Claim-Seite, Apple-/Google-Wallet-Installationspfade.
- `public/scanner.html`, `public/js/scanner.js`: Scan-/Bearbeitungsansicht mit Wallet-Update-Queue-Anbindung.
- `public/js/templateFeatures.js`: zentrale Template-Feature-Matrix für den Browser.
- `public/styles.css`: responsive Layouts, Wallet-Editor und Historienansichten.

Server lokal:

- `server/index.js`: lokaler statischer Server und lokale Entwicklungsfallbacks.
- `server/config.js`: lädt `config.json` und gibt nur nicht-sensitive Public Config aus.
- `server/supabaseAdmin.js`: serverseitige Supabase Admin-Helfer für lokale Fallbacks.

Supabase:

- `supabase/schema.sql`: direkt im Supabase SQL Editor ausführbares Schema mit Tabellen, Triggern, RLS, Storage und Validierung.
- `supabase/test-data.sql`: optionale Demo-Daten für lokale/statische Abnahme.
- `supabase/config.toml`: Edge Function JWT-Policy für Public-, Cron- und Operator-Funktionen.
- `supabase/acceptance-queries.sql`: read-only SQL-Nachweise für externe Apple-/Google-/Cron-/Payment-Abnahme.
- `supabase/functions/_shared/walletNotificationService.ts`: zentrale Kampagnen-, Empfänger-, Limit-, Log- und Queue-Logik.
- `supabase/functions/_shared/appleWalletProvider.ts`: Apple Pass JSON, Signatur, Device Registration, Webservice-Update und APNS.
- `supabase/functions/_shared/googleWalletProvider.ts`: Google Wallet Class/Object, Save-Link, Update und Message Provider.
- `supabase/functions/_shared/templateFeatures.ts`: serverseitige Template-Feature-Matrix.

Checks und Dokumentation:

- `scripts/verify-wallet-requirements-coverage.js`: Prompt-Coverage.
- `scripts/verify-wallet-architecture-contract.js`: Service-/Provider-Vertrag.
- `scripts/verify-edge-function-contracts.js`: Edge Function CORS, Auth, Fehler und Idempotenz.
- `scripts/verify-browser-secret-boundary.js` und `scripts/verify-edge-secret-boundary.js`: Secret-Grenzen.
- `scripts/verify-wallet-goal-audit.js`: externe Abnahmegates.
- `scripts/verify-wallet-external-acceptance.js`: konkrete produktive Apple-/Google-/Cron-/Payment-Abnahme.
- `scripts/wallet-readiness-report.js`: lokale redigierte Readiness-Vorprüfung für Config, Secrets, URLs und Edge Functions.
- `scripts/deploy-wallet-functions.sh`: wiederholbarer Supabase Edge Function Deploy mit Dry-Run, automatisch aus `config.json -> supabase.url` abgeleiteter Project Ref, expliziter Project-Ref-Option, `SUPABASE_CLI_BIN`-Override, `pnpm dlx supabase`/`npx --yes supabase` Fallback, Supabase-CLI-Auth-Preflight, optionaler Readiness-Prüfung und vollständiger Wallet-Function-Liste.
- `scripts/wallet-acceptance-audit.js`: redigierter Nachweis-Audit nach echten Apple-/Google-/Kampagnen-/Queue-Aktionen.
- `scripts/wallet-sql-editor-apply-report.js`: `Wallet SQL Editor Apply Report` für Bundle, Chunk-Reihenfolge, Zielprojekt und fehlende Remote-Schema-Tabellen.
- `scripts/verify-scan-demographics-statistics.js`: statische Absicherung für Erstscan-Demografie, `scan_events`, Dashboard-Besucherstatistik und Edge Deploy.
- `scripts/verify-wallet-implementation-plan.js`: diese Datei bleibt als Start-/Plan-Artefakt prüfbar.
- `scripts/verify-wallet-active-goal-context.js`: prüft den nachgereichten aktiven Goal-Kontext gegen Dokumentation, Config, Schema und Package.
- `scripts/verify-wallet-external-credentials.js`: prüft die externe Apple-/Google-Credential-Anleitung inklusive offizieller Quellen und Supabase-Secret-Befehle.
- `docs/WALLET_ACTIVE_GOAL_CONTEXT.md`: kompakte Kurzmatrix für Frontend-Framework, Tabellen, Apple/Google-Daten, Public URLs, Design und Versandregeln.
- `docs/WALLET_EXTERNAL_CREDENTIALS.md`: `Wallet External Credentials` für Apple APNs, Google Wallet Issuer, Google Service Account JSON und Go-Live-Reihenfolge.
- `docs/WALLET_INTEGRATION_CONTEXT.md`: aktive Projektfakten und Nutzerkontext.
- `docs/WALLET_GOAL_COMPLETION_AUDIT.md`: repo-seitige Evidenz und externe Gates.
- `docs/WALLET_EXTERNAL_ACCEPTANCE.md`: produktive Abnahmecheckliste mit erwarteten Datenbank- und Provider-Nachweisen.
- `docs/TEMPLATE_FEATURE_MATRIX.md`: generierte Matrix-Dokumentation.

## 3. Supabase SQL Migrationsplan

Ausführung:

1. Supabase Projekt anlegen.
2. `supabase/schema.sql` vollständig im Supabase SQL Editor ausführen.
3. Bei Schema-Aenderungen die Datei erneut komplett ausführen; sie ist idempotent angelegt.
4. Danach optional `supabase/test-data.sql` ausführen, nachdem `demo@example.com` registriert wurde.

Wichtige Migrationsblöcke:

- `operator_profiles` inklusive `unlock boolean default false`.
- Mandantenbasis über `businesses`, `card_templates`, `customer_cards`, `card_instances` und `scan_events`.
- Aktuelle Kartenwerte für Stempel, Streak, VIP, Guthaben, Garderobe, Event, Coupon und Membership.
- Wallet-Benachrichtigungstabellen: Kampagnen, Empfänger, Push-Logs und Update-Queue.
- Apple-Tabellen: `apple_wallet_devices`, `apple_wallet_registrations`, `apple_pass_versions`.
- Google-Tabelle: `google_wallet_objects`.
- Storage Bucket `wallet-assets` für Betreiber-Uploads, begrenzt auf PNG/JPEG/WebP bis 2 MB im eigenen Betreiberordner.
- RLS Policies, Format-Checks und Konsistenz-Trigger gegen Manipulation von `owner_id`, `business_id`, `template_id`, `card_instance_id`, neutralen `card_events`-Referenzen und `scan_events`; direkte Browser-Inserts in `card_events` und `scan_events` sind deaktiviert.
- `businesses` und `card_templates` haben zusätzliche Trigger, die Betreiber-/Business-Konsistenz auch für Service-Role- und Edge-Pfade erzwingen.
- SQL-Validierung der Template-Feature-Matrix über `template_feature_allowed(...)` und `card_event_required_feature(...)`.

## 4. Edge-Function-Plan

Apple:

- `claim-apple-pass`: öffentlicher Claim-Download einer Apple `.pkpass` nach Browser-Claim-Nachweis.
- `issue-apple-pass`: Betreiber-Download einer aktuellen Apple `.pkpass` für eine vorhandene Karte.
- `apple-wallet-webservice`: Apple Wallet Web Service für Registration, Unregistration, geänderte Seriennummern, Pass-Download und Apple-Logs.
- `update-apple-pass`: manuelle sichtbare Pass-Feld-Aktualisierung mit neuer Pass-Version.
- `send-apple-wallet-update`: manuelles Apple Pass Update plus APNS Push Update.

Google:

- `google-wallet-save-link`: öffentlicher Save-to-Google-Wallet Link nach Claim-Nachweis.
- `issue-google-wallet-pass`: Betreiber-Pfad zum Erstellen/Synchronisieren von Class, Object und Save-Link.
- `update-google-wallet-pass`: manuelle Object-Aktualisierung.
- `send-google-wallet-message`: manuelle `TEXT_AND_NOTIFY` Message mit Object-Fallback.

Gemeinsam:

- `create-wallet-notification-campaign`: Kampagne erstellen, Empfänger auflösen und Sofortversand anstossen.
- `send-wallet-notification`: bestehende Kampagne senden.
- `resolve-wallet-notification-recipients`: Zielgruppe serverseitig auflösen.
- `check-wallet-notification-limits`: Preflight für Reichweite, Limits und Plattformwarnungen.
- `process-scheduled-wallet-notifications`: fällige geplante Kampagnen per Cron verarbeiten.
- `process-wallet-update-queue`: vorbereitete Kartenupdates per Cron verarbeiten.

Guthaben, Scanner und PDF:

- `create-topup-payment-session`: öffentliche/pending Topup-Session für Karten mit erlaubter Guthabenfunktion.
- `confirm-topup-payment`: serverseitige Topup-Bestätigung über Payment-Webhook bzw. lokalen manuellen Provider.
- `redeem-balance`: atomare Guthaben-Abbuchung für freigeschaltete Betreiber.
- `scanner-actions`: matrixbasierte Scan-/Bearbeitungsaktionen.
- `get-business-scan-statistics`: geschützte Besucherstatistik für freigeschaltete Betreiber.
- `generate-card-pdf`: produktive QR-PDF-Erzeugung für freigeschaltete Betreiber.

JWT-Policy:

- Public-/Topup-/Webhook-/Apple-/Cron-Funktionen haben `verify_jwt=false` und prüfen selbst ApplePass Token, Browser-Claim-Key, Topup-Claim-Key, `PAYMENT_WEBHOOK_SECRET` oder `WALLET_CRON_SECRET`.
- Operator-Funktionen behalten Supabase JWT und verwenden `walletNotificationService.context(request)` für Auth, Unlock und Business-Isolation.

## 5. Implementierung Schritt für Schritt

1. Direkten Wallet-Pfad ohne PassKit aktiv halten und Legacy-Pfade deaktiviert lassen.
2. Supabase Schema ausführen und RLS/Trigger für Mandantentrennung aktivieren.
3. `config.json` lokal aus `config.example.json` anlegen, aber echte Secrets nie ins Frontend geben.
4. Edge Secrets für Supabase, Apple, Google und Cron setzen.
5. Edge Functions deployen, bevorzugt mit `bash scripts/deploy-wallet-functions.sh` oder vorab `bash scripts/deploy-wallet-functions.sh --dry-run`; falls `config.json -> supabase.url` fehlt, explizit `bash scripts/deploy-wallet-functions.sh --project-ref <PROJECT_REF>` nutzen. Wenn die Supabase CLI nicht global installiert ist, nutzt das Script `pnpm dlx supabase` oder `npx --yes supabase`; für echten Deploy vorher `supabase login` oder `SUPABASE_ACCESS_TOKEN` einrichten. Das Script prüft die CLI-Auth vorab; `--skip-auth-check` ist nur für bewusstes Ueberspringen dieses Preflights gedacht.
6. Balance-/Scanner-/Statistik-/PDF-Functions ebenfalls deployen: `create-topup-payment-session`, `confirm-topup-payment`, `redeem-balance`, `scanner-actions`, `get-business-scan-statistics`, `generate-card-pdf`.
7. Betreiber registrieren, in Supabase `operator_profiles.unlock = true` setzen und Business/Template erstellen.
8. Claim-Seite per QR-Code testen und Apple-/Google-Karten erzeugen.
9. Editor-Bereich `Wallet Benachrichtigungen` nutzen: Zielgruppe auswählen, Preflight prüfen, senden oder planen.
10. Scanner-/Bearbeitungsaktionen ausführen, beim ersten Scan Demografie erfassen, Besucherstatistik im Dashboard prüfen und Queue-Processor laufen lassen, damit Wallet-Karten den aktuellen Supabase-Stand sehen.
11. Versandhistorie, `wallet_push_logs`, `wallet_notification_recipients` und Provider-Fallbacks prüfen.

## 6. Abschliessende Secrets- und Extern-Checkliste

Supabase/App:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_PUBLIC_BASE_URL`
- `PAYMENT_PROVIDER`
- `PAYMENT_CHECKOUT_BASE_URL`
- `PAYMENT_WEBHOOK_SECRET`
- `WALLET_CRON_SECRET`
- `WALLET_BUSINESS_DAILY_LIMIT`
- `WALLET_CUSTOMER_DAILY_LIMIT`
- `WALLET_CARD_DAILY_LIMIT`
- `WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H`
- `WALLET_DUPLICATE_WINDOW_MINUTES`

Apple:

- `APPLE_TEAM_ID`
- `APPLE_PASS_TYPE_ID`
- `APPLE_WWDR_CERT`
- `APPLE_PASS_CERT`
- `APPLE_PASS_KEY`
- `APPLE_PASS_KEY_PASSWORD`
- `APPLE_WEB_SERVICE_BASE_URL`
- `APPLE_APNS_KEY_ID`
- `APPLE_APNS_TEAM_ID`
- `APPLE_APNS_AUTH_KEY`

Google:

- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`
- optional `GOOGLE_WALLET_CLASS_SUFFIX`
- optional `GOOGLE_WALLET_ORIGINS`

Public URLs:

- Webapp-Domain, z. B. `https://app.example.com`.
- Supabase Function Base URL, z. B. `https://<PROJECT_REF>.supabase.co/functions/v1`.
- Wallet-Installationsseite, z. B. `https://app.example.com/claim.html`.
- Apple `APPLE_WEB_SERVICE_BASE_URL`, z. B. `https://<PROJECT_REF>.supabase.co/functions/v1/apple-wallet-webservice` ohne zusätzliches `/v1`.

Externe Abnahme:

- Apple Pass auf iPhone speichern.
- Apple Device Registration in `apple_wallet_registrations` sehen.
- Apple Pass Update/APNS auslösen und neuen Pass über Apple Web Service abrufen.
- Google Save-Link speichern.
- Google Wallet Message oder Object Update auslösen.
- Google 24h-Limit und Fallback prüfen.
- Supabase Cron oder externen Cron für Scheduled Campaigns und Queue-Jobs aktivieren.
- Business-A/B Isolation mit zwei echten Betreibern negativ testen.
- Produktive Nachweise gemäss `docs/WALLET_EXTERNAL_ACCEPTANCE.md` sammeln und `supabase/acceptance-queries.sql` im Supabase SQL Editor ausführen.
- `node scripts/wallet-acceptance-audit.js --strict` nach echten Provider-Aktionen ausführen und die Ausgabe als redigierten Nachweis ablegen.

## 7. Lokale Abnahme

Pflichtchecks:

```bash
pnpm check
```

Lokaler Smoke:

```bash
node - <<'NODE'
const editor = await fetch('http://localhost:3000/editor.html');
const html = await editor.text();
console.log('editor', editor.status, html.includes('Wallet Benachrichtigungen'));
const config = await fetch('http://localhost:3000/api/config');
const json = await config.json();
console.log('config', config.status, 'deliveryRules' in json);
NODE
```

Nicht lokal beweisbar ohne externe Werte:

- Echte Apple Signatur und iPhone-Installation.
- Echte APNS-Zustellung.
- Echte Google Wallet API-Zustellung.
- Echte Supabase Cron-Ausführung im Zielprojekt.
