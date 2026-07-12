# Wallet Goal Completion Audit

Stand: 2026-07-03

Diese Datei ist der aktuelle Erfüllungs- und Verifikationsstand für das aktive Ziel: direkte Apple Wallet Integration, direkte Google Wallet Integration und Wallet-Benachrichtigungen aus dem Editor ohne PassKit. Sie ersetzt keine echte Produktivabnahme mit Apple-/Google-/Supabase-Secrets, macht aber transparent, was im Repository nachweisbar umgesetzt ist und was extern bewiesen werden muss. Die konkrete externe Abnahmespur liegt in `docs/WALLET_EXTERNAL_ACCEPTANCE.md`.

## Kurzstatus

Repo-seitig umgesetzt und statisch/lokal prüfbar:

- Kein aktiver PassKit-Pfad mehr: `server/passkit.js`, `supabase/functions/passkit` und `passkit-generator` fehlen; alte lokale Routen antworten mit `LEGACY_PASSKIT_ROUTE_DISABLED`.
- Direkter Apple Wallet Pfad über Supabase Edge Functions, Apple Pass Web Service, signierte `.pkpass`-Dateien, Device Registration, Pass-Versionen und APNS-Push-Vorbereitung.
- Direkter Google Wallet Pfad über Google Wallet API, Class/Object-Erzeugung, Save-Link, Object Updates und `TEXT_AND_NOTIFY`-Messages.
- Zentrale Services/Provider: `walletNotificationService`, `appleWalletProvider`, `googleWalletProvider`.
- SQL-Modell mit Wallet-Kampagnen, Empfängern, Push-Logs, Update-Queue, Apple-Tabellen, Google-Tabellen, RLS und Konsistenz-Triggern.
- Editor-Bereich `Wallet Benachrichtigungen` mit Zielgruppen, Preflight, Limits, Apple-/Google-Vorschau, Historie und redigierten Fehlerdetails.
- Nachgereichter Goal-Kontext vom 2026-07-03 ist in `docs/WALLET_ACTIVE_GOAL_CONTEXT.md` und im aktiven Integrationskontext abgebildet: kein Frontend-Framework, aktuelle Supabase-Tabellen, Apple-/Google-Daten, Public URLs, Designfelder und Versandregeln inklusive Kunde/Karte/Tag.
- Testdaten für Demo-Business, Apple-/Google-Testkarte, Stempel, VIP, Guthaben, Garderobe, Event, Coupon und drei Beispielkampagnen.

Extern noch produktiv zu beweisen:

- Apple Pass mit echten Zertifikaten auf einem iPhone installieren.
- Apple Wallet Device Registration gegen die öffentliche `apple-wallet-webservice` Function sehen.
- Apple Pass Update + APNS Push Update mit echten APNS Secrets auslösen und am Gerät abholen.
- Google Wallet Save-Link mit echter Issuer-ID und Service Account JSON speichern.
- Google Wallet Message bzw. Object Update mit echter Google Wallet API auslösen.
- Supabase Cron oder externer Cron für Scheduled Campaigns und Queue-Jobs produktiv aktivieren.
- Business-A/B Isolation mit zwei echten Supabase-Usern und echten Deployments end-to-end prüfen.

## Repo-Evidenz

| Bereich | Primäre Evidenz |
| --- | --- |
| Kein PassKit | `scripts/verify-wallet-notification-architecture.js`, `scripts/verify-wallet-requirements-coverage.js`, `server/index.js` |
| Service-Architektur | `supabase/functions/_shared/walletNotificationService.ts` |
| Apple Provider | `supabase/functions/_shared/appleWalletProvider.ts` |
| Apple Web Service | `supabase/functions/apple-wallet-webservice/index.ts` |
| Google Provider | `supabase/functions/_shared/googleWalletProvider.ts` |
| Google Contract | `scripts/verify-google-wallet-contract.js` |
| Edge Functions | `supabase/functions/*/index.ts`, `supabase/config.toml` |
| SQL/RLS | `supabase/schema.sql` |
| Editor UI | `public/editor.html`, `public/js/editor.js` |
| Aktiver Nutzerkontext | `docs/WALLET_ACTIVE_GOAL_CONTEXT.md`, `docs/WALLET_INTEGRATION_CONTEXT.md` |
| Externe Produktivabnahme | `docs/WALLET_EXTERNAL_ACCEPTANCE.md`, `supabase/acceptance-queries.sql`, `scripts/wallet-smoke-test.js`, `scripts/wallet-acceptance-audit.js`, `scripts/verify-wallet-external-acceptance.js` |
| Browser-Secret-Grenze | `scripts/verify-browser-secret-boundary.js` |
| Edge-Secret-Grenze | `scripts/verify-edge-secret-boundary.js` |
| Testdaten | `supabase/test-data.sql`, `scripts/verify-wallet-test-data.js` |
| Prompt-Coverage | `scripts/verify-wallet-requirements-coverage.js` |

## Requirement Audit

### 1. Grundregeln

Status: repo-seitig umgesetzt.

Evidenz:

- Kein aktives PassKit in `package.json`, `server/` oder `supabase/functions/`.
- Wallet-Provider sind getrennt in `appleWalletProvider.ts` und `googleWalletProvider.ts`.
- Gemeinsame Kampagnen-/Limit-/Logik liegt in `walletNotificationService.ts`.
- Browser- und Edge-Secret-Grenzen laufen in `pnpm check`.

Externes Gate:

- Mit echten Secrets prüfen, dass Apple-/Google-Provider keine Setup-Fehler mehr liefern und keine Secret-Werte in Logs/UI erscheinen.

### 2. Architektur

Status: umgesetzt.

Evidenz:

- `walletNotificationService.createCampaign()`
- `walletNotificationService.resolveRecipients()`
- `walletNotificationService.sendNow()`
- `walletNotificationService.schedule()`
- `walletNotificationService.sendToApplePass()`
- `walletNotificationService.sendToGoogleWallet()`
- `walletNotificationService.logResult()`
- `walletNotificationService.checkPlatformLimits()`
- `appleWalletProvider.issuePass()`, `signPass()`, `registerDevice()`, `unregisterDevice()`, `getUpdatedPass()`, `sendPushUpdate()`, `updatePassFields()`
- `googleWalletProvider.createClass()`, `googleWalletProvider.createObject()`, `googleWalletProvider.generateSaveLink()`, `googleWalletProvider.updateObject()`, `googleWalletProvider.addMessage()`, `googleWalletProvider.sendTextAndNotify()`

Prüfung:

```bash
pnpm check
```

### 3. Apple Wallet Integration

Status: repo-seitig umgesetzt, produktiv extern zu beweisen.

Evidenz:

- `.pkpass`-Erzeugung und Signatur: `appleWalletProvider.signPass()`
- Pass JSON mit `webServiceURL`, `authenticationToken`, `serialNumber`, `passTypeIdentifier`, `teamIdentifier`
- Webservice-Routen in `apple-wallet-webservice/index.ts`
- Tabellen: `apple_wallet_devices`, `apple_wallet_registrations`, `apple_pass_versions`
- APNS Push Update: `appleWalletProvider.sendPushUpdate()`

Externes Gate:

1. Supabase Edge Functions deployen.
2. Apple Secrets setzen.
3. Apple Pass über `claim-apple-pass` oder `issue-apple-pass` erzeugen.
4. `.pkpass` auf iPhone speichern.
5. In Supabase `apple_wallet_registrations` und `wallet_push_logs` auf `apple_device_registered` prüfen.
6. Scanner-/Kartenupdate auslösen.
7. `process-wallet-update-queue` oder `send-apple-wallet-update` ausführen.
8. `apple_pass_versions.version` muss steigen und `wallet_push_logs` muss Apple Push/Pass-Download-Ereignisse zeigen.

### 4. Google Wallet Integration

Status: repo-seitig umgesetzt, produktiv extern zu beweisen.

Evidenz:

- Class/Object/Save-Link: `googleWalletProvider.ts`
- Save-Link Claim-Pfad: `google-wallet-save-link`
- Operator-Issue: `issue-google-wallet-pass`
- Updates: `update-google-wallet-pass`
- Messages: `send-google-wallet-message`
- Tabellen: `google_wallet_objects`
- Object-Typen: `genericObject`, `loyaltyObject`, `offerObject`, `eventTicketObject`, `giftCardObject`
- Contract-Check: `scripts/verify-google-wallet-contract.js` prüft Provider, Save-Link, Messages, SQL-Isolation, Redaction und Limits.

Externes Gate:

1. `GOOGLE_WALLET_ISSUER_ID` und `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` als Supabase Secrets setzen.
2. Google Wallet API/Issuer im Google-Konto aktivieren.
3. Google Save-Link aufrufen und Karte in Google Wallet speichern.
4. `google_wallet_objects.object_id` und `save_url` prüfen.
5. `send-google-wallet-message` mit `TEXT_AND_NOTIFY` testen.
6. Limit-Fall mit mehr als 3 notification-triggering Messages pro Pass/24h prüfen.

### 5. Supabase Tabellen

Status: umgesetzt.

Evidenz:

- `supabase/schema.sql` enthält alle Wallet-, Apple- und Google-Tabellen.
- `unlock boolean default false` ist in `operator_profiles` vorhanden.
- RLS ist für neue Tabellen aktiviert.
- Konsistenz-Trigger validieren `owner_id`, `business_id`, `template_id`, `card_instance_id` und Wallet-Plattform.

Prüfung:

```bash
pnpm check
```

Externes Gate:

- `supabase/schema.sql` im Supabase SQL Editor ausführen.
- Mit zwei Betreibern Business-A/B Isolation real prüfen.

### 6. Supabase Edge Functions

Status: umgesetzt.

Evidenz:

- Alle geforderten Functions liegen unter `supabase/functions/*/index.ts`.
- `supabase/config.toml` setzt `verify_jwt=false` nur für Public-/Topup-/Webhook-/Apple-/Cron-Pfade.
- `scripts/verify-edge-function-contracts.js` prüft CORS, Fehlerstruktur, Auth-Kontext, Service-Role-Schutz, timing-safe Cron-/Payment-Secret-Prüfung, atomares Empfänger-Claiming und Idempotency.

Externes Gate:

- Alle Functions deployen und mit echten Supabase JWTs, ApplePass Headern, Claim-/Topup-Keys, Payment-Webhook-Secret und Cron Secret testen.

### 7. Editor UI

Status: umgesetzt.

Evidenz:

- `public/editor.html` enthält `Wallet Benachrichtigungen`, Zielgruppenfelder, Zeitraum, Vorschau, Reichweitenanzeige und Historie.
- `public/js/editor.js` ruft Preflight, Create Campaign, Historie und Redaction auf.

Prüfung:

```bash
pnpm check
```

Externes Gate:

- Mit echtem Supabase-Projekt Kampagne erstellen, Preflight-Warnungen sehen, Versandhistorie nach Provider-Antworten prüfen.

### 8. Template-Feature-Matrix

Status: umgesetzt.

Evidenz:

- `public/js/templateFeatures.js`
- `supabase/functions/_shared/templateFeatures.ts`
- `supabase/schema.sql -> template_feature_allowed(...)`
- `docs/TEMPLATE_FEATURE_MATRIX.md`

Prüfung:

```bash
pnpm check
```

### 9. Nachrichten-Versandlogik

Status: repo-seitig umgesetzt.

Evidenz:

- Kampagne speichern: `wallet_notification_campaigns`
- Empfänger auflösen: `wallet_notification_recipients`
- Apple/Google Versand: `sendToApplePass()`, `sendToGoogleWallet()`
- Logs: `wallet_push_logs`
- Retry- und Push-Queue: `wallet_update_queue`
- Statusfinalisierung: `sent`, `partially_failed`, `failed`
- Idempotency und parallele Empfänger-Claims sind abgesichert.

Externes Gate:

- Mit echten Apple-/Google-Karten eine Kampagne senden und Provider-Ergebnisse in UI und `wallet_push_logs` prüfen.

### 10. Scheduled und Location-Based Notifications

Status: MVP-seitig umgesetzt.

Evidenz:

- `process-scheduled-wallet-notifications`
- `process-wallet-update-queue`
- `walletNotificationService.schedule()`
- `location_based` best-effort: Apple `locations[].relevantText`, Google Object Update Fallback.

Externes Gate:

- Supabase Cron oder externen Cron mit `WALLET_CRON_SECRET` einrichten.
- Fällige geplante Kampagne und Queue-Job auslösen.

### 11. Rate Limits und Spam-Schutz

Status: umgesetzt.

Evidenz:

- Business-/Kunden-/Kartenlimits: `WALLET_BUSINESS_DAILY_LIMIT`, `WALLET_CUSTOMER_DAILY_LIMIT`, `WALLET_CARD_DAILY_LIMIT`
- Google-Limit: `WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H`
- Deduplizierung: `WALLET_DUPLICATE_WINDOW_MINUTES`
- Leere/zu lange Nachrichten werden blockiert.
- Preflight-Warnungen im Editor.

Externes Gate:

- Mit echten Karten Limitfälle auslösen und UI/Logs prüfen.

### 12. Supabase Secrets

Status: dokumentiert und statisch abgesichert.

Evidenz:

- `config.example.json`
- README Secret-Setup
- `scripts/verify-wallet-deploy-checklist.js`
- `scripts/verify-browser-secret-boundary.js`
- `scripts/verify-edge-secret-boundary.js`

Pflicht-Secrets für die externe Abnahme:

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
- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_PUBLIC_BASE_URL`
- `PAYMENT_PROVIDER`
- `PAYMENT_CHECKOUT_BASE_URL`
- `PAYMENT_WEBHOOK_SECRET`
- `WALLET_CRON_SECRET`

Externes Gate:

- Secrets per `supabase secrets set ...` setzen und Edge Functions neu deployen.

### 13. Security

Status: repo-seitig umgesetzt und statisch abgesichert.

Evidenz:

- RLS in `supabase/schema.sql`
- `current_operator_unlocked()`
- Edge Auth über `walletNotificationService.context(request)` oder eigene Operator-Guards.
- Claim-/Topup-/Payment-Webhook-/ApplePass-/Cron-Guards für Public Functions.
- Audit Logs, Idempotency Keys, Business-Isolation und Manipulationsschutz.

Externes Gate:

- Business A kann Business B nicht sehen, keine Empfänger auflösen, keine Karte updaten und keine Kampagne versenden.

### 14. Testdaten

Status: umgesetzt.

Evidenz:

- `supabase/test-data.sql`
- `scripts/verify-wallet-test-data.js`

Externes Gate:

- Nach Registrierung von `demo@example.com` Testdaten im SQL Editor ausführen und UI-Preflight/Historie prüfen.

### 15. Tests

Status: lokale/statische Tests umgesetzt, echte Provider-Tests extern offen.

Lokale Tests:

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

Provider-Tests offen:

- Apple Pass auf iPhone speichern.
- Apple Device Registration prüfen.
- Apple Pass Update/APNS prüfen.
- Google Save-Link speichern.
- Google Message senden.
- Google Limits prüfen.

### 16. Erwartetes Ergebnis

Status: repo-seitig vorbereitet und prüfbar; produktive Vollabnahme braucht externe Secrets, Zertifikate, Deployed Edge Functions, iPhone/Google Wallet und Cron.

Akzeptanz-Gates:

1. `pnpm check` ist grün.
2. Lokaler Smoke ist grün.
3. `supabase/schema.sql` läuft im SQL Editor.
4. Alle Wallet Edge Functions sind deployed.
5. Alle Apple-/Google-/Supabase-Secrets sind gesetzt.
6. Apple `.pkpass` kann auf einem iPhone gespeichert werden.
7. Apple Webservice registriert das Gerät und liefert aktualisierte Pass-Versionen.
8. Apple Push Update erzeugt ein neues `apple_pass_versions`-Objekt und APNS-Ergebnis.
9. Google Save-Link kann gespeichert werden und `google_wallet_objects` wird aktualisiert.
10. Google Message/Object Update ist in Google Wallet sichtbar oder als Plattform-Fallback geloggt.
11. Kampagnenversand zeigt Status, Empfänger, Providerfehler und Fallbacks im Editor.
12. Business-A/B Isolation ist mit zwei echten Nutzern negativ getestet.
13. Die Nachweise aus `docs/WALLET_EXTERNAL_ACCEPTANCE.md` und `supabase/acceptance-queries.sql` sind gesammelt.
