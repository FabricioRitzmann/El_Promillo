# Wallet External Acceptance

Stand: 2026-07-03

Diese Checkliste beschreibt die produktive Endabnahme für die direkte Apple-Wallet- und Google-Wallet-Integration. Sie enthält keine echten Secrets. Alles, was hier als Secret genannt wird, gehört in Supabase Secrets oder in den Secret Store des externen Dienstes, niemals ins Frontend.

## 1. Voraussetzungen

- `supabase/schema.sql` wurde vollständig im Supabase SQL Editor ausgeführt. Optional vorher `node scripts/prepare-supabase-sql-editor-bundle.js --write` nutzen und `tmp/supabase-schema-sql-editor-bundle.sql` im SQL Editor ausführen; das Bundle enthält zusätzlich `notify pgrst, 'reload schema';`. Wenn der SQL Editor kleinere Dateien braucht, `node scripts/prepare-supabase-sql-editor-chunks.js --write --force` nutzen und die SQL-Editor-Chunks in `tmp/supabase-schema-sql-editor-chunks/` numerisch nacheinander ausführen. Alternativ `bash scripts/apply-supabase-schema.sh --dry-run` und danach `bash scripts/apply-supabase-schema.sh` nutzen; dafür `SUPABASE_DB_URL` setzen oder das Projekt per `supabase link --project-ref <PROJECT_REF>` linken. `node scripts/wallet-sql-editor-apply-report.js` (`Wallet SQL Editor Apply Report`) zeigt Zielprojekt, Bundle, Chunk-Reihenfolge und fehlende Remote-Tabellen redigiert an.
- `supabase/test-data.sql` wurde optional nach Registrierung von `demo@example.com` ausgeführt.
- Alle Edge Functions aus der README wurden deployed, z. B. mit `bash scripts/deploy-wallet-functions.sh`. Das Script leitet die Project Ref aus `config.json -> supabase.url` ab; falls diese URL fehlt, explizit `bash scripts/deploy-wallet-functions.sh --project-ref <PROJECT_REF>` verwenden. Wenn kein globaler `supabase` Befehl installiert ist, nutzt das Script `pnpm dlx supabase` oder `npx --yes supabase`; für echten Deploy muss Supabase trotzdem per `supabase login` oder `SUPABASE_ACCESS_TOKEN` authentifiziert sein. Vor dem Deploy prüft das Script diese Auth per `supabase projects list`; `--skip-auth-check` überspringt nur diesen Preflight.
- `supabase/config.toml` wurde mit deployed, damit Public-, Topup-, Payment-Webhook-, Apple-Webservice- und Cron-Pfade `verify_jwt=false` nutzen.
- `APP_PUBLIC_BASE_URL` zeigt auf die öffentliche Webapp-Domain.
- `APPLE_WEB_SERVICE_BASE_URL` zeigt exakt auf `https://<PROJECT_REF>.supabase.co/functions/v1/apple-wallet-webservice`, ohne weiteres `/v1`.
- `WALLET_CRON_SECRET` und `PAYMENT_WEBHOOK_SECRET` sind mindestens 32 Zeichen lang.
- Optional `node scripts/prepare-supabase-secrets-local.js --write` ausführen, um vorhandene lokale Supabase-/Apple-Werte, PEM-Dateien aus `certs/`, abgeleitete Wallet-URLs und lokale Cron-/Payment-Secrets in `supabase/secrets.local.env` vorzubereiten. Fehlende externe Werte wie APNs Key ID/Auth Key oder Google Wallet Issuer/Service Account werden nur als Kommentar geschrieben.
- Fehlende Apple-/Google-Werte nach [docs/WALLET_EXTERNAL_CREDENTIALS.md](docs/WALLET_EXTERNAL_CREDENTIALS.md) (`Wallet External Credentials`) beschaffen: Apple APNs `.p8`, `APPLE_APNS_KEY_ID`, Google Wallet Issuer ID und Google Service Account JSON.
- Danach `bash scripts/set-supabase-secrets.sh --dry-run` und `bash scripts/set-supabase-secrets.sh` ausführen. Das Script nutzt `supabase`, `pnpm dlx supabase`, `npx --yes supabase` oder `SUPABASE_CLI_BIN`, leitet die Project Ref aus `config.json -> supabase.url` ab und gibt keine Secret-Werte aus. Alternativ `supabase/secrets.example.env` nach `supabase/secrets.local.env` kopieren und manuell füllen. PEM-/p8-/JSON-Werte können auch per `supabase secrets set NAME="$(cat datei)"` gesetzt werden.
- Optional vor der externen Abnahme `node scripts/wallet-readiness-report.js --strict` ausführen. Der Wallet Readiness Report zeigt nur Statusmeldungen und keine Secret-Werte.
- Alternativ oder zusätzlich `node scripts/wallet-go-live-report.js` ausführen. `Wallet Go-Live Report` fasst lokale Secret-Datei, SQL-Editor-Bundle, Readiness, Remote-Schema, Edge-Function-Preflights und den lokalen Supabase-Deploy-CLI-Status in einer redigierten Ausgabe zusammen; mit `--skip-remote` läuft er ohne Live-Supabase-Abfrage.
- Optional `node scripts/wallet-go-live-runbook.js --write --force` ausführen. `Wallet Go-Live Runbook` schreibt `tmp/wallet-go-live-runbook.md` als redigierte, aktuelle Checkliste für Secrets, SQL, Edge Functions und finale Apple-/Google-Nachweise.
- Optional `node scripts/prepare-supabase-cron-sql.js --write --force` ausführen. Das Script erzeugt `tmp/supabase-cron.sql` aus `supabase/cron.example.sql`, setzt Project Ref und `WALLET_CRON_SECRET` ein, gibt den Secret-Wert nicht aus und druckt keine SQL-Inhalte. Danach kann die Datei mit `bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql` oder im Supabase SQL Editor angewendet werden.
- Optional `node scripts/wallet-credential-files-check.js --strict` ausführen. `Wallet Credential Files Check` prüft Apple WWDR, Pass-Zertifikat/Private-Key-Match, APNs `.p8` und Google-Service-Account-JSON, gibt aber keine Zertifikats-, Private-Key- oder JSON-Werte aus.
- Vor echten Wallet-Aktionen `node scripts/wallet-remote-schema-check.js --strict` ausführen. `Wallet Remote Supabase Schema Check` prüft, ob Tabellen und Spalten aus `supabase/schema.sql` im Supabase REST-Schema erreichbar sind; Secrets und Tokens werden nicht ausgegeben.
- Vor oder nach dem Deploy den Smoke-Test ausführen: lokal `node scripts/wallet-local-smoke-runner.js --strict` oder `node scripts/wallet-smoke-test.js --base-url http://localhost:3000 --strict`, produktiv zusätzlich `node scripts/wallet-smoke-test.js --functions --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --strict`.
- `node scripts/wallet-edge-functions-report.js --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1` (`Wallet Edge Functions Report`) prüft alle deployten Wallet Edge Functions per redigiertem CORS/OPTIONS-Preflight ohne Operator-JWTs oder Secrets.
- Nach echten Apple-/Google-/Kampagnen-/Queue-Aktionen `node scripts/wallet-acceptance-audit.js --strict` ausführen. `Wallet External Acceptance Audit` gibt nur Zählwerte und Statusnachweise aus, keine Secrets.
- Wenn der Schema-Check oder Audit `Could not find the table ... in the schema cache` meldet, `supabase/schema.sql`, das generierte SQL-Editor-Bundle oder die SQL-Editor-Chunks erneut vollständig ausführen, optional `notify pgrst, 'reload schema';` ausführen und danach den Check wiederholen. Diese Meldung bedeutet, dass die Supabase-DB oder der REST-Schema-Cache noch nicht auf dem Projektstand ist.
- Nach den externen Aktionen `supabase/acceptance-queries.sql` im Supabase SQL Editor ausführen. Die Datei enthält nur Read-only-Nachweisqueries für Apple, Google, Kampagnen, Queue/Cron, Payment und Business-Isolation.

## 2. Supabase Secrets

Pflicht:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_PUBLIC_BASE_URL`
- `WALLET_CRON_SECRET`
- `PAYMENT_WEBHOOK_SECRET`

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

Payment:

- `PAYMENT_PROVIDER`
- `PAYMENT_CHECKOUT_BASE_URL`
- `PAYMENT_WEBHOOK_SECRET`

Limits:

- `WALLET_BUSINESS_DAILY_LIMIT`
- `WALLET_CUSTOMER_DAILY_LIMIT`
- `WALLET_CARD_DAILY_LIMIT`
- `WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H`
- `WALLET_DUPLICATE_WINDOW_MINUTES`
- `WALLET_PUBLIC_CLAIM_RATE_LIMIT`
- `WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS`
- `WALLET_RECIPIENT_PROCESSING_TIMEOUT_MINUTES`
- `WALLET_QUEUE_PROCESSING_TIMEOUT_MINUTES`

## 3. Apple Wallet Abnahme

1. Ein aktives Apple-fähiges Template im Dashboard erstellen.
2. Claim-Link auf einem iPhone per HTTPS öffnen.
3. Karte über `claim-apple-pass` als `.pkpass` installieren.
4. In Supabase prüfen, manuell oder über `supabase/acceptance-queries.sql`:
   - `customer_cards.pass_authentication_token` ist gesetzt.
   - `card_instances.apple_serial_number` ist gesetzt.
   - `apple_pass_versions` enthält `webServiceURL`, `authenticationToken`, Barcode und sichtbare Statusfelder.
5. Nach der Installation warten, bis Apple den Webservice registriert.
6. In Supabase prüfen, manuell oder über `supabase/acceptance-queries.sql`:
   - `apple_wallet_devices` enthält das Device.
   - `apple_wallet_registrations` enthält `device_library_identifier`, `pass_type_identifier`, `serial_number`, `card_instance_id` und nur den Token-Hash.
   - `wallet_push_logs` enthält `apple_device_registered`.
7. Im Scanner oder Editor den Kartenstatus aendern.
8. `process-wallet-update-queue` laufen lassen oder `send-apple-wallet-update` auslösen.
9. In Supabase prüfen, manuell oder über `supabase/acceptance-queries.sql`:
   - neue `apple_pass_versions.version`
   - `wallet_push_logs` mit `manual_apple_push_update`, `apple_pass_downloaded` oder passendem Fallback
   - `customer_cards` und `card_instances` zeigen denselben aktuellen Status.
10. Am iPhone prüfen, ob der Pass nach dem Oeffnen bzw. nach dem Apple-Update den neuen Stand zeigt.

## 4. Google Wallet Abnahme

1. Google Wallet API und Issuer im Google-Konto freischalten.
2. `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` mit einem Service Account setzen, der Wallet Objects verwalten darf.
3. Ein Google-fähiges Template erstellen.
4. Claim-Link per HTTPS öffnen und `google-wallet-save-link` auslösen.
5. Karte in Google Wallet speichern.
6. In Supabase prüfen, manuell oder über `supabase/acceptance-queries.sql`:
   - `google_wallet_objects.object_id`, `class_id`, `object_type` und `card_instance_id` sind gesetzt.
   - `card_instances.google_object_id`, `wallet_object_id` und `wallet_serial_number` verweisen auf dieselbe echte Google Object ID.
   - `wallet_push_logs` enthält `google_wallet_save_link`, ohne signierten Save-JWT im Log.
7. `send-google-wallet-message` oder eine Kampagne senden.
8. In Supabase prüfen, manuell oder über `supabase/acceptance-queries.sql`:
   - `wallet_notification_campaigns.status` ist `sent`, `partially_failed` oder `failed`.
   - `wallet_notification_recipients` enthält pro Empfänger Status und Plattform.
   - `wallet_push_logs` enthält `google_text_and_notify` oder `google_object_message_fallback`.
9. Google-Limit testen: mehr als drei notification-triggering Messages pro Pass innerhalb von 24 Stunden müssen als `limited` oder Fallback geloggt werden.

## 5. Scheduled, Location und Queue

1. `node scripts/prepare-supabase-cron-sql.js --write --force` ausführen und danach `bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql` anwenden. Alternativ `supabase/cron.example.sql` kopieren, Platzhalter ersetzen und im Supabase SQL Editor ausführen.
2. In `cron.job` prüfen:
   - `wallet-process-scheduled-notifications` läuft jede Minute.
   - `wallet-process-update-queue` läuft alle zwei Minuten.
3. Eine Kampagne mit `send_type = scheduled` und fälligem `scheduled_at` erstellen.
4. Nach dem Cron-Lauf prüfen:
   - Kampagne ist nicht mehr `scheduled`.
   - Empfänger wurden verarbeitet.
   - `wallet_push_logs` enthält Versand- oder Fehlerlogs.
5. Eine `location_based` Kampagne testen:
   - Apple bekommt relevante Pass-Felder.
   - Google wird als Object-Update oder Plattform-Fallback geloggt, falls kein echter Standort-Push verfügbar ist.
6. Scanner- oder Guthaben-Aktion ausführen und prüfen, dass `wallet_update_queue` von `pending` zu `sent` oder `failed` wechselt.

## 6. Business-Isolation

1. Zwei Betreiber registrieren und beide manuell mit `operator_profiles.unlock = true` freischalten.
2. Für Business A und Business B je ein Template und je eine Kundenkarte erstellen.
3. Mit Betreiber A versuchen:
   - Template von Betreiber B zu laden.
   - Karteninstanz von Betreiber B per Scanner zu laden.
   - Kampagne an Karten von Betreiber B zu senden.
   - Google/Apple Update für Karteninstanz von Betreiber B auszuführen.
4. Erwartung:
   - Browser-Requests liefern keine fremden Daten.
   - Edge Functions liefern `403`, `404` oder strukturierte Kontextfehler.
   - Keine fremden `wallet_notification_recipients`, `wallet_push_logs`, `apple_pass_versions` oder `google_wallet_objects` werden erzeugt.

## 7. Payment/Topup

1. Balance-Template oder Template mit aktivierter Guthabenfunktion erstellen.
2. Claim-Seite öffnen und Topup-Session erzeugen.
3. In Supabase prüfen:
   - `topup_payment_sessions.status = pending`
   - die Antwort enthält nur minimierte Session-Felder.
4. Provider-Webhook an `confirm-topup-payment` senden:
   - Header `x-payment-webhook-secret: <PAYMENT_WEBHOOK_SECRET>`
   - Body mit `topupPaymentSessionId` oder `providerSessionId`
5. Erwartung:
   - `confirm_card_topup(...)` bucht atomar.
   - `balance_transactions` und `card_events` werden geschrieben.
   - `customer_cards` und `card_instances` zeigen das neue Guthaben.
   - falsches oder zu kurzes Secret liefert strukturierte Fehler und keine Buchung.

## 8. Abschlussnachweis

Die Abnahme gilt nur als bestanden, wenn diese Nachweise gesammelt wurden:

- Ausgabe von `pnpm check`
- Ausgabe oder Datei von `node scripts/wallet-go-live-runbook.js --write --force`
- Ausgabe von `node scripts/wallet-readiness-report.js --strict`
- Ausgabe von `node scripts/wallet-local-smoke-runner.js --strict` oder `node scripts/wallet-smoke-test.js --base-url <WEBAPP_URL> --strict`
- Ausgabe von `node scripts/wallet-smoke-test.js --functions --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --strict`
- Ausgabe von `node scripts/wallet-edge-functions-report.js --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --strict`
- Ausgabe von `node scripts/wallet-acceptance-audit.js --strict`
- Ausgabe der Read-only-Queries aus `supabase/acceptance-queries.sql`
- Smoke-Test gegen die produktive Domain oder lokale URL
- Screenshot oder Log der Apple-iPhone-Installation
- `apple_wallet_registrations` Eintrag
- `apple_pass_versions` vor und nach Update
- Google Save-Link Speicherung und `google_wallet_objects` Eintrag
- Google Message/Fallback Log
- Cron-Job-Liste aus `cron.job`
- Business-A/B Negativtest
- Payment-Webhook-Test oder bewusst dokumentierter Payment-Fallback
