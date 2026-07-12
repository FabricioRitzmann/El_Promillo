# Wallet Integration Context

Diese Datei sammelt die Projektfakten und externen Werte, die für das aktive Ziel wichtig sind: direkte Apple Wallet Integration, direkte Google Wallet Integration und Wallet-Benachrichtigungen aus dem Editor. Keine echten Secrets hier eintragen.

Der kompakte Aktiver Goal-Kontext liegt in `docs/WALLET_ACTIVE_GOAL_CONTEXT.md`. Dort sind die nachgereichten Projektvorgaben zu Frontend-Framework, Supabase-Tabellen, Apple Developer Daten, Google Wallet Daten, Public URLs, Design und Versandregeln als prüfbare Kurzmatrix festgehalten.

Die externe Apple-/Google-Credential-Anleitung liegt in `docs/WALLET_EXTERNAL_CREDENTIALS.md` (`Wallet External Credentials`). Sie beschreibt, wo Apple APNs Key ID/Auth Key, Google Wallet Issuer ID und Google Service Account JSON herkommen, wie sie lokal abgelegt werden und welche Supabase-Secret-Commands danach auszuführen sind.

Der aktuelle Abschluss- und Extern-Test-Stand ist in `docs/WALLET_GOAL_COMPLETION_AUDIT.md` dokumentiert. Dort sind repo-seitig nachweisbare Punkte und noch externe Apple-/Google-/Supabase-Abnahmegates getrennt aufgeführt. Die konkrete produktive Abnahmespur liegt in `docs/WALLET_EXTERNAL_ACCEPTANCE.md`. Der kompakte Umsetzungsplan mit Analyse, Dateirollen, SQL-Migrationsplan, Edge-Function-Plan und Secret-Checkliste liegt in `docs/WALLET_IMPLEMENTATION_PLAN.md`.

Das produktive Cron-Setup für geplante Kampagnen und Wallet-Update-Queue ist in `docs/WALLET_CRON_SETUP.md` dokumentiert; die SQL-Vorlage liegt in `supabase/cron.example.sql`.

Für Supabase Cron kann `node scripts/prepare-supabase-cron-sql.js --write --force` aus der Vorlage eine echte `tmp/supabase-cron.sql` erzeugen. Das Script setzt Project Ref und `WALLET_CRON_SECRET` ein, gibt den Secret-Wert nicht aus und schreibt die Datei nur in `tmp/`, weil sie den Cron-Secret-Wert enthält. Anwenden danach mit `bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql` oder manuell im Supabase SQL Editor.

Read-only SQL-Nachweise für die externe Apple-/Google-/Cron-/Payment-Abnahme liegen in `supabase/acceptance-queries.sql`.

Für den Supabase SQL Editor kann `node scripts/prepare-supabase-sql-editor-bundle.js --write` ein temporäres `tmp/supabase-schema-sql-editor-bundle.sql` aus `supabase/schema.sql` erzeugen. Das Bundle enthält zusätzlich `notify pgrst, 'reload schema';`, liest keine Secrets und wird nicht versioniert. Wenn der SQL Editor kleinere Dateien braucht, erzeugt `node scripts/prepare-supabase-sql-editor-chunks.js --write --force` SQL-Editor-Chunks unter `tmp/supabase-schema-sql-editor-chunks/`, die numerisch nacheinander ausgeführt werden.

Alternativ kann `bash scripts/apply-supabase-schema.sh --dry-run` bzw. `bash scripts/apply-supabase-schema.sh` das generierte Bundle per `supabase db query --file` ausführen. Das Script gibt SQL-Inhalt und Datenbank-URL nicht aus, nutzt `SUPABASE_DB_URL` oder ein gelinktes Supabase-Projekt (`supabase link --project-ref <PROJECT_REF>`) und fällt bei fehlender globaler CLI auf `pnpm dlx supabase` oder `npx --yes supabase` zurück.

Der `Wallet SQL Editor Apply Report` liegt in `scripts/wallet-sql-editor-apply-report.js`. Er listet das generierte Bundle, die numerische Chunk-Reihenfolge, das Zielprojekt und fehlende Remote-Schema-Tabellen redigiert auf, ohne Supabase Keys oder Wallet-Secrets auszugeben.

Der manuelle Smoke-Test liegt in `scripts/wallet-smoke-test.js`. Lokal prüft er Webapp-Seiten mit `node scripts/wallet-smoke-test.js --base-url http://localhost:3000 --strict`; produktiv kann er mit `node scripts/wallet-smoke-test.js --functions --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --strict` öffentliche Edge-Function-Preflights prüfen. Der lokale Runner `node scripts/wallet-local-smoke-runner.js --strict` nutzt eine bestehende lokale Instanz oder startet kurz selbst einen Server auf einem freien Port und beendet ihn danach wieder. Beide Scripts geben keine Secrets aus.

Der `Wallet Edge Functions Report` liegt in `scripts/wallet-edge-functions-report.js`. Er prüft alle Wallet Edge Functions per CORS/OPTIONS-Preflight gegen die Supabase Functions Base URL und akzeptiert für geschützte Betreiber-Functions auch `401`/`403`, weil diese Functions ohne Betreiber-JWT nicht offen sein sollen. Der Report sendet keine Operator-JWTs und gibt keine Secrets aus.

Der redigierte `Wallet Go-Live Report` liegt in `scripts/wallet-go-live-report.js`. Er fasst lokale Secret-Datei, SQL-Editor-Bundle, Readiness, Remote-Schema, Edge-Function-Preflights und den lokalen Supabase-Deploy-CLI-Status zusammen, gibt keine Secrets aus und kann mit `--skip-remote` ohne Live-Supabase-Abfrage laufen.

Das redigierte `Wallet Go-Live Runbook` liegt in `scripts/wallet-go-live-runbook.js`. Es kombiniert Go-Live Report, SQL-Editor-Apply-Report und Edge-Functions-Report in eine aktuelle Markdown-Checkliste unter `tmp/wallet-go-live-runbook.md`; `tmp/` ist ignoriert, damit keine laufenden Abnahme-Artefakte versioniert werden.

Der `Wallet Credential Files Check` liegt in `scripts/wallet-credential-files-check.js`. Er prüft Apple WWDR, Apple Pass-Zertifikat, Private-Key-Match, APNs `.p8` und Google-Service-Account-JSON lokal und redigiert, ohne Zertifikatsinhalte, Private Keys oder JSON-Werte auszugeben.

Der produktive Function-Deploy ist als wiederholbares Script vorbereitet: `bash scripts/deploy-wallet-functions.sh --dry-run` zeigt alle Deploy-Befehle, `bash scripts/deploy-wallet-functions.sh` deployt alle Wallet Edge Functions und leitet die Project Ref aus `config.json -> supabase.url` ab, sofern `--project-ref` und `SUPABASE_PROJECT_REF` fehlen. `bash scripts/deploy-wallet-functions.sh --project-ref <PROJECT_REF>` bleibt als expliziter Fallback möglich. Wenn kein globaler `supabase` Befehl vorhanden ist, nutzt das Script automatisch `pnpm dlx supabase` oder `npx --yes supabase`; `SUPABASE_CLI_BIN=/pfad/zur/supabase-cli` kann einen festen CLI-Pfad erzwingen. Für echten Deploy braucht Supabase weiterhin `supabase login` oder `SUPABASE_ACCESS_TOKEN`; das Script prüft diese Auth vorab per `supabase projects list` und kann den Preflight mit `bash scripts/deploy-wallet-functions.sh --skip-auth-check` überspringen. Das Script setzt keine Secrets, deployt `_shared` nicht separat und erwartet `supabase/config.toml`, damit die Public-/Cron-/Apple-Webservice-JWT-Policy erhalten bleibt.

Nach echten externen Aktionen kann `node scripts/wallet-acceptance-audit.js --strict` laufen. `Wallet External Acceptance Audit` nutzt serverseitig `SUPABASE_SERVICE_ROLE_KEY`, gibt aber nur redigierte Zählwerte/Statusnachweise für Apple, Google, Kampagnen, Queue, Payment und Business-Isolation aus. `supabase/acceptance-queries.sql` bleibt die SQL-Editor-Ergänzung für Cron-Jobs und Detailnachweise.

Vor echten Wallet-Aktionen kann `node scripts/wallet-remote-schema-check.js --strict` laufen. `Wallet Remote Supabase Schema Check` prüft nur Tabellen- und Spalten-Erreichbarkeit im Supabase REST-Schema und gibt keine Secrets oder Tokens aus. Wenn der Check `schema cache` meldet, `supabase/schema.sql` im Supabase SQL Editor komplett ausführen, optional `notify pgrst, 'reload schema';` ausführen und den Check wiederholen.

Die vollständige redigierte Supabase-Secrets-Vorlage liegt in `supabase/secrets.example.env`. Für echte Werte lokal kopieren:

```bash
node scripts/prepare-supabase-secrets-local.js --write
bash scripts/set-supabase-secrets.sh --dry-run
bash scripts/set-supabase-secrets.sh
```

`prepare-supabase-secrets-local.js` bereitet `supabase/secrets.local.env` aus vorhandener lokaler Config, PEM-Dateien in `certs/`, Google-Issuer-/Service-Account-Dateien, Samsung-Portalwerten aus lokalen Samsung-Env-Dateien, `samsung-wallet-keys/samsung_wallet_private.key`, `samsung-wallet-keys/samsung_public_cert.pem`, abgeleiteter Supabase Functions URL und generierten Cron-/Payment-Secrets vor. Fehlende externe Werte wie Apple APNs Key ID/Auth Key, Google Wallet Service Account oder ein Samsung Private Key, der nicht zum Partner-Zertifikat passt, bleiben Kommentare und werden nicht als Platzhalter gesetzt.

`set-supabase-secrets.sh` setzt diese lokale Env-Datei redigiert in Supabase. Das Script gibt keine Secret-Werte aus, leitet die Project Ref aus `config.json -> supabase.url` ab, nutzt bei fehlendem globalem `supabase` automatisch `pnpm dlx supabase` oder `npx --yes supabase` und prüft Supabase-CLI-Auth vor echten Writes per `supabase projects list`.

Manuell bleibt ebenfalls möglich:

```bash
cp supabase/secrets.example.env supabase/secrets.local.env
bash scripts/set-supabase-secrets.sh
# Direkte Alternative:
supabase secrets set --env-file supabase/secrets.local.env
```

`supabase/secrets.local.env` ist ignoriert und darf echte Apple Developer Daten, Google Wallet Daten, Public URLs, Cron-/Payment-Secrets und Versandlimits enthalten. `scripts/wallet-readiness-report.js` lädt diese lokale Datei für Statuschecks automatisch und gibt weiterhin keine Secret-Werte aus.

## Aktiver Goal-Kontext vom 2026-07-03

Nachgereichter und am 2026-07-03 erneut bestätigter Nutzerkontext aus dem aktiven Goal: Diese Liste beantwortet die offenen Architekturpunkte zu Frontend-Framework, Supabase-Tabellen, Apple Developer Daten, Google Wallet Daten, Public URLs, Designfeldern und Versandregeln für den aktuellen Projektstand.

Diese Punkte gehören ab jetzt ausdrücklich zum aktiven Goal und müssen bei weiteren Aenderungen berücksichtigt werden:

- Frontend-Framework: kein React, kein Vite, kein Next.js, kein anderes Frontend-Framework; die App bleibt HTML, CSS und Vanilla JavaScript.
- Aktuelle Supabase-Tabellen: `businesses`, `card_templates`, `card_instances`, `operator_profiles`, Supabase `auth.users`, `card_events`, `scan_events`, Wallet-Notification-Tabellen, Apple-Wallet-Tabellen und Google-Wallet-Tabellen. `profiles` und `users` sind im Projekt durch `operator_profiles` und `auth.users` abgebildet; `scan_events` ist die eigene Statistik-Tabelle für Scanner-Besuche.
- Apple Developer Daten: Team ID, Pass Type ID, Pass Certificate, WWDR Certificate, Private Key, Key Passwort, APNs Key ID und APNs Auth Key werden nur serverseitig als Supabase Secrets oder lokal in nicht versionierten Dateien verwendet.
- Google Wallet Daten: Issuer ID, Service Account JSON und die gewünschten Pass-Typen Generic, Loyalty, Offer und Event Ticket sind Teil des Setups.
- Public URLs: Domain der Webapp, Supabase Function Base URL und Wallet-Installationsseite müssen für lokale und produktive Umgebung getrennt gepflegt werden.
- Design: Logo-Felder, Kartenvorschau-Komponenten, vorhandene Template-Typen und bestehende QR/PDF-Komponenten bleiben Teil der Editor- und Wallet-Logik.
- Versandregeln: Max. Nachrichten pro Kunde/Karte/Tag, Max. Nachrichten pro Business/Tag, Standardtexte und erlaubte Zielgruppen müssen im Backend validiert und im UI nachvollziehbar angezeigt werden.
- MVP-Auslegung für "Kunde/Tag": Das Kundenlimit ist als eigenes `WALLET_CUSTOMER_DAILY_LIMIT` umgesetzt. Es gruppiert über `card_instances.customer_id`, sobald ein globaler Kundenschlüssel existiert, und nutzt bis dahin die verknüpfte `customer_card_id` als stabilen technischen Kundenschlüssel.

Direkt nachgereichte Goal-Checkliste des Nutzers, die bei weiteren Aenderungen als verbindlicher Projektkontext gilt:

- Aktueller Nachtrag aus dem laufenden Goal: Diese Punkte sind nicht optional, sondern bei allen weiteren Wallet-, Editor-, Supabase- und Versandregeln als aktive Projektvorgaben mitzudenken.
- Verwendetes Frontend-Framework: React / Vite / Next.js / anderes? Antwort für dieses Projekt: keines davon, sondern HTML, CSS und Vanilla JavaScript.
- Aktuelle Supabase Tabellen: `businesses`, `card_templates`, `card_instances`, `operator_profiles`, Supabase `auth.users`, `card_events` sowie die Wallet-, Apple- und Google-Tabellen aus `supabase/schema.sql`.
- Apple Developer Daten: Team ID, Pass Type ID, Pass Certificate, WWDR Certificate, Private Key, Key Passwort, APNs Key ID und APNs Auth Key sind notwendige externe Werte und dürfen nur serverseitig genutzt werden.
- Google Wallet Daten: Issuer ID, Service Account JSON und die gewünschten Pass-Typen Generic, Loyalty, Offer und Event Ticket bleiben Teil des aktiven Wallet-Ziels.
- Public URLs: Webapp-Domain, Supabase Function Base URL und Wallet-Installationsseite müssen für lokal und produktiv getrennt gepflegt werden.
- Design: Logo-Felder, Kartenvorschau-Komponenten, vorhandene Template-Typen sowie bestehende QR/PDF-Komponenten gehören zur Editor- und Wallet-Logik.
- Versandregeln: Max. Nachrichten pro Kunde/Tag, Max. Nachrichten pro Karte/Tag, Standardtexte und erlaubte Zielgruppen müssen bei UI, Edge Functions, SQL-Validierung und Logs berücksichtigt werden.

Aktive Abgleichliste für die weitere Umsetzung:

| Bereich | Aktueller Projektentscheid | Wo gepflegt/geprüft |
| --- | --- | --- |
| Frontend-Framework | Kein React, kein Vite, kein Next.js; HTML/CSS/Vanilla JS bleibt verbindlich. | `public/`, `package.json`, `pnpm check` |
| Supabase Tabellen | `businesses`, `card_templates`, `card_instances`, `operator_profiles`, `auth.users`, `card_events` plus Wallet-/Apple-/Google-Tabellen. | `supabase/schema.sql` |
| Apple Developer Daten | Team ID, Pass Type ID, Pass Certificate, WWDR Certificate, Private Key, Key Passwort, APNs Key ID, APNs Auth Key. | Supabase Secrets, `config.example.json -> appleWalletDirect` |
| Google Wallet Daten | Issuer ID, Service Account JSON, Generic, Loyalty, Offer, Event Ticket. | Supabase Secrets, `config.example.json -> googleWallet` |
| Public URLs | Webapp-Domain, Supabase Function Base URL, Wallet-Installationsseite. | `config.example.json -> publicUrls`, `supabase/secrets.example.env`, Supabase Secrets |
| Design | Logo-Felder, Kartenvorschau, Template-Typen, QR/PDF-Komponenten. | `public/js/ui.js`, `public/js/editor.js`, `server/pdf.js`, `generate-card-pdf` |
| Versandregeln | Kunde/Tag, Karte/Tag, Business/Tag, Standardtexte, erlaubte Zielgruppen. | `deliveryRules`, Edge Functions, SQL-Validierung |

## 1. Frontend-Framework

Aktueller Stand:

- Kein React
- Kein Vite
- Kein Next.js
- Kein Frontend-Framework
- Frontend besteht aus HTML, CSS und Vanilla JavaScript

Relevante Dateien:

- `public/index.html`
- `public/dashboard.html`
- `public/editor.html`
- `public/claim.html`
- `public/scanner.html`
- `public/styles.css`
- `public/js/*.js`

## 2. Aktuelle Supabase-Tabellen

Aktueller Stand laut `supabase/schema.sql`:

- `operator_profiles` statt `profiles`
- Supabase Auth nutzt intern `auth.users`
- `businesses`
- `card_templates`
- `customer_cards`
- `card_instances`
- `balance_transactions`
- `topup_payment_sessions`
- `wallet_update_jobs`
- `wallet_device_registrations`
- `apple_wallet_devices`
- `apple_wallet_registrations`
- `apple_pass_versions`
- `google_wallet_objects`
- `samsung_wallet_instances`
- `samsung_wallet_events`
- `wallet_notification_campaigns`
- `wallet_notification_recipients`
- `wallet_push_logs`
- `wallet_update_queue`
- `card_events`
- `scan_events`

Hinweis:

- Scanner- und Bearbeitungsereignisse schreiben `scan_events` für Besucherstatistik und `card_events` für Audit-/Wallet-Ereignisse.
- Neue Betreiber werden über `operator_profiles.unlock` standardmässig mit `false` angelegt.
- `businesses` und `card_templates` sind nicht nur per RLS, sondern auch per SQL-Trigger gegen falsche Owner-/Business-Kombinationen und nachträgliches Umhängen geschützt.
- Die SQL-Grants für `operator_profiles`, `businesses` und `card_templates` sind spaltenbasiert. Normale Browser-Clients können `operator_profiles.unlock` und `owner_id` nicht aktualisieren; Business- und Template-Ownership bleibt RLS-/Trigger- und Grant-seitig geschützt.

## 3. Apple Developer Daten

Diese Werte werden für direkte Apple Wallet Passes, Apple Wallet Web Service und APNS gebraucht. Sie gehören ausschliesslich in Supabase Edge Secrets oder lokal in nicht versionierte Konfigurationen, niemals ins Frontend.

Benötigte Supabase Secrets:

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

Lokale Platzhalter in `config.example.json`:

- `appleWalletDirect.teamId`
- `appleWalletDirect.passTypeId`
- `appleWalletDirect.wwdrCert`
- `appleWalletDirect.passCert`
- `appleWalletDirect.passKey`
- `appleWalletDirect.passKeyPassword`
- `appleWalletDirect.webServiceBaseUrl`
- `appleWalletDirect.apnsKeyId`
- `appleWalletDirect.apnsTeamId`
- `appleWalletDirect.apnsAuthKey`

Aktuelle Implementierung:

- Apple Pass JSON: `supabase/functions/_shared/appleWalletProvider.ts`
- `.pkpass` Signatur: `appleWalletProvider.signPass()`
- Apple Web Service: `supabase/functions/apple-wallet-webservice/index.ts`
- Apple Push Update: `appleWalletProvider.sendPushUpdate()`
- Apple Web Service Registrierungen, Abmeldungen und Pass-Downloads müssen `Authorization: ApplePass <authenticationToken>` senden; der Token wird im Webservice hashbasiert und timing-safe gegen `customer_cards.pass_authentication_token` verglichen. Registrierungen speichern nur den SHA-256-Hash des Tokens in `apple_wallet_registrations.authentication_token_hash`. Neue Device-Registrierungen antworten mit `201`, erneute Registrierungen desselben Device/Pass-Paares mit `200`. Bevor der Provider eine bestehende Device/Pass/Serial-Registrierung per Upsert aktualisiert, prüft er `owner_id`, `business_id`, `template_id` und `card_instance_id`; Mismatches liefern `APPLE_WALLET_REGISTRATION_CONTEXT_MISMATCH`, damit keine Registrierung auf eine andere Karte oder einen anderen Mandanten umgehängt wird. Wenn der Device-/Push-Token-Datensatz nicht gespeichert werden kann, liefert der Provider `APPLE_WALLET_DEVICE_SAVE_FAILED`, statt eine Registrierung ohne Push-Ziel vorzutäuschen.
- Die Apple-Liste geänderter Seriennummern (`GET /v1/devices/.../registrations/:passTypeIdentifier`) wird ohne pro-Pass-Token über `deviceLibraryIdentifier` und `passTypeIdentifier` aufgelöst, weil Apple für diesen Request keinen eindeutigen Karten-Token vorsieht.
- Die Apple-Liste geänderter Seriennummern setzt `lastUpdated` auf das neueste echte `apple_pass_versions.last_updated_at` der zurückgegebenen Pass-Versionen. Der Changed-Serials-Pfad liest Pass-Versionen nur für die `card_instance_id`/`serial_number`-Paare, die für dieses Device in `apple_wallet_registrations` gespeichert sind. `GET /v1/passes/:passTypeIdentifier/:serialNumber` liest die aktuelle Pass-Version nach erfolgreicher ApplePass-Auth zusätzlich mit Betreiber-, Business-, Template- und Karteninstanz-Filtern, beachtet `If-Modified-Since` und antwortet mit `304`, wenn Apple bereits die aktuelle Pass-Version hat.
- Apple Web Service Registrierungen, Abmeldungen und Pass-Abrufe lösen Seriennummern zuerst über `card_instances.apple_serial_number` und, für alte Pass-Versionen, über `card_instances.id` auf; erst danach folgen Legacy-Felder auf `customer_cards`. Kundenkarten werden nur mit `wallet_platform = apple` geladen. Der Webservice prüft den Kontext zwischen `customer_cards` und `card_instances` auf denselben Betreiber, dasselbe Business und dasselbe Template und validiert zusätzlich, dass Seriennummer und Pass Type ID zur gespeicherten Apple-Karteninstanz bzw. letzten Pass-Version passen. Ein Kontextfehler liefert `APPLE_CARD_CONTEXT_MISMATCH`. Abmeldungen filtern beim Delete zusätzlich nach Betreiber, Business, Template und Karteninstanz, bleiben idempotent und geben `removed: true` nur zurück, wenn Supabase tatsächlich eine passende `apple_wallet_registrations`-Zeile gelöscht hat.
- Der Apple Web Service und der gemeinsame Apple-Provider laden Karteninstanzen, Kundenkarten, Templates, Pass-Versionen und Registrierungen über explizite Select-Listen. Registrierungsantworten enthalten keine `authentication_token_hash`-Rohdaten, und Pass-Versionen werden nur mit den Feldern geladen, die zum Signieren, Caching und Redigieren gebraucht werden.
- Apple Web Service Registrierungen, Abmeldungen, geänderte Seriennummern und Pass-Downloads schreiben Audit-Einträge in `wallet_push_logs`: `apple_device_registered`, `apple_device_unregistered`, `apple_changed_serials_listed`, `apple_pass_downloaded`, `apple_pass_not_modified` und `apple_pass_download_failed`.
- Der Apple-Webservice-Contract wird lokal mit `scripts/verify-apple-webservice-contract.js` abgesichert: Routen und Methoden für Registrieren/Abmelden/geänderte Seriennummern/Pass-Download/Log, ApplePass-Auth, `passesUpdatedSince`, `If-Modified-Since`, `201` vs. `200` bei Registrierungen, SQL-Tabellen und `push_token_suffix` statt vollem Push-Token in APNS-Ergebnissen.
- `/v1/log` akzeptiert `GET` und `POST`; POST-Diagnosezeilen landen nur in den Supabase Function Logs und zählen nicht als Wallet-Nachrichten.
- `issue-apple-pass` arbeitet nur für Apple-Wallet-Karten, erstellt eine Pass-Version, versucht die `.pkpass`-Signatur und loggt `issue_apple_pass` in `wallet_push_logs`. Karteninstanz, Template, Kundenkarte und vorhandene Pass-Versionen werden mit expliziten internen Select-Listen geladen. `pass_json`, Assets und `pass_authentication_token` werden nur serverseitig für Signatur, Idempotency-Replay und Apple-Webservice-Token genutzt und nicht roh an Browser-Clients zurückgegeben. Fehlende Apple-Signaturkonfiguration gibt HTTP `501`, echte Signaturfehler geben `502` zurück. Optionaler `idempotency-key` als Header oder Body-Feld prüft vor einer neuen Pass-Version den bestehenden Issue-Log und signiert die vorhandene Pass-Version erneut als `.pkpass`. Der nachgelagerte Kartenstatus-Write ist trotz Service Role zusätzlich über `owner_id`, `business_id`, `template_id` und `wallet_platform = apple` eingegrenzt und muss eine Zeile aktualisieren.
- `claim-apple-pass` arbeitet für den öffentlichen Claim-Weg, erzeugt vor dem Download benoetigte Apple-PNG-Fallbacks serverseitig, signiert nach `claim-card` eine vorhandene aktuelle Apple-Pass-Version erneut oder erstellt bei neueren Karten-/Template-/Asset-Daten eine frische Version. Alte Pass-Versionen ohne die benoetigten generierten Asset-Slots werden nicht wiederverwendet. Jeder Download loggt `claim_apple_pass` und nutzt ausschliesslich serverseitige Supabase Secrets. Der nachgelagerte Kartenstatus-Write wird trotz Service Role zusätzlich über `customer_card_id`, `owner_id`, `business_id`, `template_id` und `wallet_platform = apple` eingegrenzt und muss eine Zeile aktualisieren.
- Der Apple-Provider erzwingt vor neuen Apple-Pass-Versionen ein gespeichertes `customer_cards.pass_authentication_token`. Fehlt der Token bei alten oder manuell angelegten Apple-Karten, wird er serverseitig erzeugt und atomar nachgetragen, bevor `pass.json` gebaut wird. Diese Nachrüstung filtert die Kundenkarte trotz Service Role zusätzlich über `owner_id`, `business_id` und `template_id`; eine nicht exakt passende Verknüpfung liefert `APPLE_CUSTOMER_CARD_CONTEXT_MISMATCH`. `claim-apple-pass` führt diesen Schritt vor der Wiederverwendung alter Pass-Versionen aus, damit `.pkpass`-Dateien nicht ohne `authenticationToken`/`webServiceURL` ausgeliefert werden.
- Apple-Passes werden im direkten Wallet-Update-Pfad nicht signiert, wenn `authenticationToken` oder eine HTTPS-`webServiceURL` fehlen. In diesem Fall geben Claim-, Issue- und Apple-Webservice-Functions `APPLE_WEB_SERVICE_CONFIG_MISSING` als Setup-Fehler mit HTTP `501` zurück, statt eine nicht updatefähige Karte oder einen scheinbar erfolgreichen JSON-Download auszugeben.
- Apple-Webservice-, Apple-Issue- und Apple-Claim-Fehlerantworten für Pass-Downloads geben keine rohe `pass_json`, keine Assets, keine `.pkpass`-Bytes und keinen `authenticationToken` zurück. Bei Signaturfehlern werden nur `publicApplePassVersion(...)` bzw. `publicAppleSigningResult(...)` mit kompakten Signing-Fehlerfeldern ausgeliefert; vollständige Passdaten und interne Signaturdetails bleiben serverseitig.
- Die Claim-Seite lädt Apple-Wallet-Dateien nur noch über `claim-apple-pass`; der alte lokale `/api/passes/:cardId.pkpass` PassKit-Endpunkt ist kein Claim-Fallback mehr.
- Der lokale Fallback `/api/cards/claim` speichert weiterhin Karten, falls `claim-card` noch nicht deployed ist, gibt aber für Apple keinen aktiven `/api/passes`-Link mehr zurück. Die Antwort verweist stattdessen auf `claim-apple-pass`. Lokal nutzt dieser Fallback einen In-Memory-Rate-Limiter mit `deliveryRules.publicClaimRateLimit` und `deliveryRules.publicClaimRateLimitWindowSeconds`, damit lokale Tests nicht ein deutlich offeneres Sicherheitsmodell als die Edge Functions verwenden.
- Die alten lokalen Node-Routen `GET /api/passes/:cardId.pkpass` und `ANY /api/passkit/*` sind deaktiviert und antworten mit `410 LEGACY_PASSKIT_ROUTE_DISABLED`. Die alte lokale Implementierungsdatei `server/passkit.js` ist entfernt. Apple-Pass-Dateien, Registrierungen und Updates laufen im aktiven Pfad ausschliesslich über `claim-apple-pass`, `issue-apple-pass` und `apple-wallet-webservice`.
- Die Scanner-Ansicht lädt aktuelle Apple-Wallet-Dateien für Betreiber über `issue-apple-pass` mit Betreiber-Auth und optionalem `idempotency-key`; auch dort gibt es keinen lokalen PassKit-Download-Fallback mehr.
- Eine `supabase/functions/passkit` Function existiert im aktiven Projekt nicht mehr. Alte Clients müssen direkt auf `claim-apple-pass`, `issue-apple-pass` oder `apple-wallet-webservice` umgestellt werden.
- `send-apple-wallet-update` prüft Limits, kann eine optionale sichtbare Nachricht als neue Pass-Version speichern und loggt `manual_apple_push_update` in `wallet_push_logs`. Karteninstanz, Template und Kundenkarte werden mit expliziten internen Select-Listen geladen. Wenn die Pass-Version gespeichert wurde, aber APNS noch nicht konfiguriert ist oder kein iPhone registriert ist, wird der Empfänger/Log als `prepared` markiert: Kartenupdate ja, sichtbarer Push nein. Die Browserantwort enthält nur minimierte Push-Zählwerte und Warncodes; APNS-Response-Text, Device-Identifier und Push-Token-Suffixe bleiben im serverseitigen Audit-Kontext.
- APNS-Antwort `410` wird als veraltete Apple-Device-Registration behandelt. Der Provider versucht die Registrierung automatisch zu entfernen und schreibt im Provider-Ergebnis `APPLE_APNS_UNREGISTERED`. `stale_registration_removed` ist nur `true`, wenn der Delete wirklich eine gespeicherte Registrierung getroffen hat; andernfalls bleibt der Wert `false` oder es steht `stale_registration_remove_error` im Ergebnis.
- APNS-Pass-Updates laden Device-Registrierungen nur mit passender `owner_id`, `business_id`, `template_id`, `card_instance_id`, Pass Type ID und Serial. Danach senden sie `apns-topic = APPLE_PASS_TYPE_ID`, `apns-push-type = background`, `apns-priority = 5` und ein leeres `{}` Payload; die eigentliche Kartenaktualisierung wird anschliessend über den Apple Wallet Web Service abgeholt.
- `update-apple-pass` validiert `message` oder `fields`, blockiert manuelle Aenderungen an Apple-Kernfeldern wie `formatVersion`, `passTypeIdentifier`, `serialNumber`, `authenticationToken`, `webServiceURL`, Barcode und NFC, prüft Tageslimits, erstellt danach eine neue Pass-Version, lässt den Provider eine Queue-Aufgabe schreiben und loggt `manual_apple_pass_update` mit Status `queued`. Karteninstanz, Template und Kundenkarte werden mit expliziten internen Select-Listen geladen. `queued` zählt für diesen manuellen Pass-Update-Pfad bereits gegen Business-/Kunden-/Kartenlimits, damit sichtbare Updates nicht unbegrenzt vor der Queue-Verarbeitung gestapelt werden.
- Apple-Pass-Versionen werden retry-fähig geschrieben: Bei parallelen Updates derselben Karte wiederholt der Provider den Insert nach einem Unique-Konflikt mit der nächsten freien Versionsnummer.
- Apple Pass-Versionen rendern den aktuellen Supabase-Stand sichtbar in `headerFields`, `secondaryFields`, `auxiliaryFields` und `backFields`: Stempel, Streak, VIP, Guthaben, Garderobe, Event/Check-in, Coupon, Mitgliedschaft, Karten-ID und Belohnungstext, sofern der jeweilige Template-Typ diese Funktion unterstützt.
- Apple Pass-Versionen speichern Template-Assets serverseitig mit: `card_templates.logo_url` sowie Icon-/Bild-URLs aus `settings` werden als `logo`/`icon` in `apple_pass_versions.assets` abgelegt und beim Signieren in die `.pkpass`-ZIP gepackt. Der Apple-Provider lädt Asset-URLs aber nur, wenn sie per HTTPS aus dem eigenen Supabase-Storage-Pfad `/storage/v1/object/public/wallet-assets/` stammen; fremde oder lokale URLs werden nicht serverseitig gefetcht. Der Claim-Pfad verwendet keine alte Pass-Version mehr wieder, wenn das Template ein erlaubtes Logo/Icon hat, die gespeicherte Pass-Version aber keine passenden Assets enthält.
- Der öffentliche Storage-Bucket `wallet-assets` bleibt auf Betreiberordner begrenzt und akzeptiert für Wallet-Assets nur PNG, JPEG oder WebP bis maximal 2 MB. SVG und beliebige `image/*`-Uploads sind im Editor und in den Storage Policies deaktiviert, weil die Dateien in Vorschau, PDF und `.pkpass`-Assets verwendet werden. Die Storage Policies verlangen zusätzlich valide Grössen-Metadaten, damit das 2-MB-Limit serverseitig nicht umgangen wird.

Wichtig:

- `APPLE_WEB_SERVICE_BASE_URL` muss öffentlich per HTTPS erreichbar sein.
- Beispiel: `https://<PROJECT_REF>.supabase.co/functions/v1/apple-wallet-webservice`
- Nach dem Function-Namen kein weiteres `/v1` anhängen, Apple Wallet ruft `/v1/...` selbst auf.

## 4. Google Wallet Daten

Benötigte Supabase Secrets:

- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`
- `GOOGLE_WALLET_CLASS_SUFFIX`
- `GOOGLE_WALLET_ORIGINS`; wenn leer, nutzen `issue-google-wallet-pass`/`googleWalletProvider.generateSaveLink()` und `google-wallet-save-link` serverseitig `APP_PUBLIC_BASE_URL` als Save-JWT-Origin-Fallback. Beide Pfade normalisieren volle URLs vor dem Signieren auf `new URL(value).origin`, damit keine Pfade oder Query-Strings in `origins` landen.

Legacy-Alternative, falls keine komplette JSON-Datei als Secret verwendet wird:

- `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_WALLET_PRIVATE_KEY`

Der direkte Google-Provider und der öffentliche `google-wallet-save-link` validieren die Service-Account-JSON serverseitig. Ungültiges JSON und fehlende `client_email`/`private_key` Werte werden als strukturierte Setup-Fehler geloggt bzw. an die Edge-Function-Antwort weitergegeben, ohne Secrets ins Frontend zu leaken.

Supabase-/App- und Limit-Secrets:

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
- `WALLET_PUBLIC_CLAIM_RATE_LIMIT`
- `WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS`
- `WALLET_RECIPIENT_PROCESSING_TIMEOUT_MINUTES`
- `WALLET_QUEUE_PROCESSING_TIMEOUT_MINUTES`

Browser-Secret-Grenze:

- `scripts/verify-browser-secret-boundary.js` scannt `public/` auf serverseitige Secret-Felder und prüft, dass `server/config.js#getPublicConfig` nur Supabase URL, Supabase Anon Key, App-URLs und nicht-sensitive Delivery-Regeln ausliefert. PassKit-Felder und selbst ein Legacy-PassKit-Aktivstatus werden nicht mehr an den Browser ausgeliefert.
- Der Check läuft in `pnpm check`; Service Role Keys, Apple-Zertifikate/APNS-Werte und Google-Wallet-Service-Account-Daten dürfen dadurch nicht versehentlich im Browser-Bundle landen.

Edge-Secret-Grenze:

- `scripts/verify-edge-secret-boundary.js` scannt die Supabase Edge Functions auf rohe Config-/Secret-Rückgaben, Secret-Logs und Wallet-Log-Payloads mit Secret-Objekten.
- Der Check bestätigt zusätzlich, dass Apple Pass Key, Apple APNS Auth Key, Google Service Account JSON und Supabase Service Role Key nur serverseitig aus Supabase Secrets gelesen werden.
- Edge-Functions dürfen Setup-Hinweise mit Secret-Namen zurückgeben, aber niemals Secret-Werte, Zertifikatsinhalte, Private Keys, Service-Account-JSON oder volle Apple Push Tokens.

Gewünschte Pass-Typen und aktueller Mapping-Stand:

| Gewünschter Typ | Aktueller Google Object Type | Status |
| --- | --- | --- |
| Generic | `genericObject` | vorbereitet |
| Loyalty | `loyaltyObject` | vorbereitet für Stempel, Streak, VIP, Membership |
| Offer | `offerObject` | vorbereitet für Coupon inklusive Titel, Anbieter, Details, Bedingungen, Gültigkeit und Barcode |
| Event Ticket | `eventTicketObject` | vorbereitet für `event_card` |
| Gift Card | `giftCardObject` | vorbereitet für `balance_card` inklusive Kartennummer, Barcode und Google-`Money`-Guthaben |

Relevante Dateien:

- `supabase/functions/_shared/googleWalletProvider.ts`
- `supabase/functions/issue-google-wallet-pass/index.ts`
- `supabase/functions/update-google-wallet-pass/index.ts`
- `supabase/functions/send-google-wallet-message/index.ts`
- `supabase/functions/google-wallet-save-link/index.ts`

Security-Hinweis:

- `update-google-wallet-pass` akzeptiert `objectId` nur, wenn sie in `google_wallet_objects` dem eingeloggten `owner_id` zugeordnet ist oder zur übergebenen `cardInstanceId` gehört.
- Der Google `object_type` wird für Updates aus der gespeicherten Zuordnung gelesen, nicht frei aus dem Frontend vertraut. Manuelle Google-Messages, manuelle Google-Object-Updates, Kampagnenversand und Queue-Jobs bevorzugen `google_wallet_objects.object_id`/`object_type` vor Legacy-Feldern auf `card_instances` und validieren den Object Type gegen die fünf unterstützten Typen.
- Claim-Schlüssel in `customer_cards.wallet_object_id`, Apple-Serials in `card_instances.apple_serial_number` und Google-Object-IDs in `card_instances.google_object_id` sind per Unique-Index eindeutig. Die Claim-Function blockiert denselben Wallet-Schlüssel für ein anderes Template mit `CLAIM_WALLET_OBJECT_ID_CONFLICT`. Parallele Claims mit demselben Wallet-Schlüssel werden nach SQL-Unique-Konflikt noch einmal geladen und als `reused` behandelt, sofern die vorhandene Karte zum selben Template gehört.
- `issue-google-wallet-pass` arbeitet nur für Google-Wallet-Karten, erstellt/synchronisiert Class und Object, speichert `google_wallet_objects` und loggt `issue_google_wallet_pass` in `wallet_push_logs`. Karteninstanz, Template, Kundenkarte und gespeicherte Google-Object-Zuordnung werden mit expliziten internen Select-Listen geladen. Der signierte Save-Link wird dem Betreiber in der API-Antwort geliefert und in `google_wallet_objects.save_url` für Idempotenz/Updates abgelegt; der dauerhafte `wallet_push_logs.response_payload` speichert nur Metadaten wie `save_url_present` und `save_url_length`, nicht den Save-JWT selbst. Browserantworten für Google-Issue, Google-Object-Updates und Google-Messages liefern nur minimierte Status-, Object-, Class-, Fehler- und Warnfelder; rohe Google-Provider-Responses bleiben serverseitig. Fehlende oder ungültige Google-Wallet-Secrets geben HTTP `501`, Teilfehler `207` und Provider/API-Fehler `502` zurück. Optionaler `idempotency-key` als Header oder Body-Feld gibt bei Wiederholung den bestehenden Issue-Log zurück, statt Google Class/Object/Save-Link erneut aufzurufen; der Replay-Payload wird dabei aus `google_wallet_objects` um Object-ID, Class-ID, Object-Type und gespeicherten Save-Link ergänzt, falls der Audit-Log nur redigierte Metadaten enthält.
- Bei Teilfehlern speichert `issue-google-wallet-pass` die Google-Zuordnung auch dann, wenn nur der signierte Save-Link eine Object-ID liefert. `google_wallet_objects`, `card_instances.google_object_id`, `wallet_object_id` und `wallet_serial_number` werden aus `objectResult` oder `saveLink` befüllt, damit spätere Updates dieselbe Karteninstanz finden können. Persistiert wird aber nur, wenn Object-ID, Class-ID und Object-Type vollständig vorhanden sind; sonst liefert die Function `GOOGLE_WALLET_OBJECT_IDENTITY_INCOMPLETE`, statt eine halb gültige Zuordnung zu speichern. Wenn die Karteninstanz mit einer `customer_cards`-Zeile verknüpft ist, synchronisiert der Betreiber-Issue-Pfad auch dort `wallet_object_id` und `wallet_serial_number` und bewahrt einen vorhandenen `metadata.google_wallet_claim_key`. Der `customer_cards`- und `card_instances`-Write ist an Betreiber, Business, Template und `wallet_platform = google` gebunden und muss jeweils eine Zeile aktualisieren.
- `google-wallet-save-link` speichert beim Claim-Weg ebenfalls `google_wallet_objects`, aktualisiert `card_instances.google_object_id` und legt die `save_url` ab, damit spätere Benachrichtigungen das Wallet Object mandantensicher finden. Die Function akzeptiert als Claim-Nachweis den ursprünglichen Browser-Claim-Schlüssel oder die bereits normalisierte Google Object ID und lehnt fremde Browser-Claims mit `GOOGLE_CLAIM_TOKEN_MISMATCH` ab. Vor einer neuen Save-JWT-Signatur wird ein vorhandener aktueller `google_wallet_objects.save_url` für dieselbe echte `card_instances.id` wiederverwendet; `customer_cards.id` wird nur als Kundekartenreferenz im Event-Detail geloggt. Die öffentlichen Service-Role-Writes auf `customer_cards` und `card_instances` sind zusätzlich an `owner_id`, `business_id`, `template_id` und `wallet_platform = google` gebunden und müssen jeweils eine Zeile aktualisieren. Google-Object-Upserts in Save-Link und Betreiber-Issue fordern ebenfalls `select('id')` zurück und gelten nur als erfolgreich, wenn Supabase die erwartete Zuordnungszeile bestätigt. Persistenzfehler beim Speichern von Kundenkarte, Karteninstanz, Google-Object oder Event werden strukturiert als `GOOGLE_CUSTOMER_CARD_UPDATE_FAILED`, `CARD_WALLET_STATE_UPDATE_FAILED`, `GOOGLE_WALLET_OBJECT_SAVE_FAILED` oder `GOOGLE_WALLET_EVENT_LOG_FAILED` gemeldet. Key-Format- und Save-JWT-Signaturfehler werden als `GOOGLE_WALLET_PRIVATE_KEY_FORMAT` oder `GOOGLE_WALLET_SAVE_LINK_SIGNING_FAILED` gemeldet, ohne Private Key oder Service-Account-JSON auszugeben. Jeder erfolgreiche Save-Link-Versuch wird zusätzlich als `google_wallet_save_link` in `wallet_push_logs` auditiert; der Log speichert nur Metadaten wie `save_url_present` und nicht den signierten Save-JWT selbst.
- Google Class-IDs sind templategebunden: `GOOGLE_WALLET_CLASS_SUFFIX`, Template-Typ und Template-ID bilden zusammen den Suffix hinter der Issuer-ID. Provider und öffentlicher Save-Link nutzen dieselbe Regel; ein gespeicherter Save-Link wird nur wiederverwendet, wenn `object_id`, `class_id` und `object_type` weiterhin zur Karteninstanz passen.
- Der gemeinsame Google-Provider normalisiert rohe Browser-Claim-IDs vor API-Aufrufen zu echten Google Wallet Object IDs mit Issuer-Prefix. Wenn `claim-card` zuerst z. B. `google_<uuid>` speichert, erzeugen Issue/Save-Link daraus `<issuerId>.google_<uuid>` und speichern diese Object-ID anschliessend auf `card_instances`, `customer_cards` und `google_wallet_objects`.
- Für die öffentliche Claim-Idempotenz bleibt der rohe Browser-Schlüssel getrennt erhalten: `claim-card` und der lokale `/api/cards/claim`-Fallback speichern `metadata.google_wallet_claim_key`, und `google-wallet-save-link` bewahrt diesen Wert beim Umstellen von `wallet_object_id` auf die echte Google Object ID. Wiederholte Claims mit dem alten Browser-Schlüssel finden dadurch dieselbe Karte.
- `google_wallet_objects.card_instance_id` ist eindeutig indiziert. Issue- und Claim-Save-Link-Functions verwenden deshalb `onConflict: 'card_instance_id'`, damit pro Kundenkarte genau ein Google-Wallet-Object-Datensatz existiert.
- Manuelle Google-Updates werden in `wallet_push_logs` als `manual_google_object_update` protokolliert. Der freie `patch` darf nur gezielte sichtbare Statusfelder enthalten; Object-/Class-/Issuer-/Account-IDs, Barcode und `kind` werden aus der gespeicherten Karteninstanz bzw. Google-Konfiguration abgeleitet und nicht aus dem Frontend übernommen. `update-google-wallet-pass` lädt Karteninstanz, Template, Kundenkarte und Google-Object-Zuordnung mit expliziten internen Select-Listen. Vor dem Google-Object-Patch prüft die Function dieselben Business-/Kunden-/Kartenlimits und `push_enabled`-Opt-outs wie andere manuelle Wallet-Operationen; erfolgreiche Object-Updates verbrauchen Tageslimit, zählen aber nicht als sichtbare `notification_count_24h`-Pushs. Nach einem erfolgreichen Provider-Patch müssen sowohl `card_instances` als auch `google_wallet_objects` über `owner_id`, `business_id`, `template_id`, Karteninstanz, Plattform bzw. Object-Type exakt eine passende Zeile aktualisieren, sonst liefert der Pfad `CARD_WALLET_STATE_UPDATE_FAILED` oder `GOOGLE_WALLET_OBJECT_SAVE_FAILED`.
- `send-google-wallet-message` loggt Limit-Fälle, erfolgreiche `TEXT_AND_NOTIFY`-Messages und `google_object_message_fallback`-Updates in `wallet_push_logs`. Karteninstanz, Template, Kundenkarte und Google-Object-Zuordnung werden mit expliziten internen Select-Listen geladen. Erfolgreiche Google-Messages und Object-Fallbacks aktualisieren danach `google_wallet_objects.updated_at` nur, wenn `owner_id`, `business_id`, `card_instance_id`, `template_id`, `object_id` und `object_type` zur erwarteten Karteninstanz passen, und synchronisieren `card_instances.google_object_id`, `wallet_object_id` und `wallet_serial_number` auf dieselbe echte Google Object ID.
- Der direkte Google-Provider normalisiert REST-API-Fehler als `GOOGLE_WALLET_API_<STATUS>` mit lesbarer `error_message`, `error_reason` und Provider-Antwort, damit Editor-Historie und Logs strukturierte Fehler anzeigen. Token-Signing-, OAuth-Request- und Wallet-API-Netzwerkfehler werden als `GOOGLE_WALLET_TOKEN_SIGNING_FAILED`, `GOOGLE_WALLET_SAVE_LINK_SIGNING_FAILED`, `GOOGLE_WALLET_TOKEN_REQUEST_FAILED` oder `GOOGLE_WALLET_API_REQUEST_FAILED` zurückgegeben, ohne Access Tokens, Private Keys oder Service-Account-JSON offenzulegen.
- Der zentrale Kampagnenversand nutzt bei fehlgeschlagenem Google `TEXT_AND_NOTIFY` ebenfalls `google_object_message_fallback` und schreibt eine sichtbare Warnung in `provider_response`, wenn das Kartenupdate als Fallback gespeichert wurde.
- Google-Fallbacks werden im zentralen Log als `google_object_message_fallback` oder `google_location_object_update` geschrieben, damit das Google-24h-Limit nur echte `google_text_and_notify`-Benachrichtigungen zählt. Reine Fallback-Kartenupdates aktualisieren `last_wallet_update_at` und das passende `google_wallet_objects.updated_at`, erhöhen aber nicht `last_notification_at` oder `notification_count_24h`.
- Google Objects und Save-Links zeigen aktuelle Statusmodule aus Supabase: Stempel, Streak, VIP, Guthaben, Garderobe, Event/Check-in, Coupon, Mitgliedschaft, Karten-ID und bei passenden Karten den Belohnungstext.
- Edge-Scanner und lokaler Scanner-Fallback laden die echte `card_instances.id` über `customer_card_id`, synchronisieren dort den aktuellen Kartenstand und schreiben Guthaben-Transaktionen mit dieser ID. Beim ersten Scan einer Karteninstanz antwortet `scanner-actions` mit `requires_demographics`, bis Geschlecht (`male`/`female`) und Altersgruppe (`18_plus`/`25_plus`/`30_plus`) erfasst sind. Diese Werte werden danach auf `card_instances` gespeichert, in `scan_events` für Besucherstatistik protokolliert und bei Clubkarten-Aktionen über `club_card_actions.scan_event_id` verknüpft. `scanner-actions` lädt Kundenkarten und Templates für Suche, Validierung und aktualisierte Browserantworten mit expliziten Select-Listen und gibt Karten nur über `publicOperatorCard(updatedCard)` aus. Beim Sync bleibt `wallet_serial_number` plattformbewusst: Apple nutzt die Pass-Serial, Google behält die Wallet Object ID. Card-Instance-Sync, Guthaben-Transaktion, `scan_events`-Insert und Audit-Event müssen jeweils erfolgreich gespeichert werden; sonst melden beide Scanner-Pfade `SCANNER_CARD_INSTANCE_SYNC_FAILED`, `SCANNER_BALANCE_TRANSACTION_SAVE_FAILED`, `SCANNER_SCAN_EVENT_SAVE_FAILED` oder `SCANNER_CARD_EVENT_SAVE_FAILED`, statt einen nicht vollständig persistierten Stand als Erfolg zurückzugeben. Dadurch bleibt der lokale Fallback kompatibel, falls `customer_cards.id` und `card_instances.id` später nicht mehr identisch sind.
- `get-business-scan-statistics` ist die geschützte Edge Function für die Dashboard-Besucherstatistik. Sie prüft Betreiber-JWT, `operator_profiles.unlock` und Business-Zugehörigkeit, liest nur eigene `scan_events` und liefert aggregierte KPIs, Diagrammdaten und letzte Scans für Filter wie Zeitraum, Kartentyp, Clubfunktion, Geschlecht, Altersgruppe, Erst-/Wiederholungsscan, Aktion und Uhrzeit.
- Der lokale Node-Fallback lädt QR-PDF-Templates, Claim-Templates und Scanner-Karten mit expliziten Select-Listen (`localTemplatePublicSelect`, `localTemplateInternalSelect`, `localOperatorCardSelect`) statt rohen `*`-Selects. Damit gelangen `pass_authentication_token`, rohe interne Betreiber-/Business-Felder und andere nicht benötigte Wallet-Daten nicht einmal in den browsernahen lokalen Antwortpfad.
- Der Google-Wallet-Contract wird lokal mit `scripts/verify-google-wallet-contract.js` abgesichert: Provider-Konfiguration, Service-Account-JSON, PKCS8 Private Key Format, Save-Link-Origin-Normalisierung, Object-Type-Mapping für Generic/Loyalty/Offer/Event Ticket, redigierte Save-JWT-Logs, `TEXT_AND_NOTIFY`, Fallbacks, SQL-Isolation und Limitzählung.

## 4a. Samsung Wallet Daten

Samsung Wallet ist als zusätzlicher Provider über Supabase Edge Functions vorbereitet. Der MVP nutzt Samsung Data Fetch Links: Der öffentliche Link enthält nur `pdata/refId`; Samsung ruft danach `samsung-wallet-server` serverseitig ab.

Benötigte Supabase Secrets:

- `SAMSUNG_WALLET_PARTNER_ID`
- `SAMSUNG_WALLET_PARTNER_CODE`
- `SAMSUNG_WALLET_CARD_ID`
- `SAMSUNG_WALLET_CARD_TYPE`
- `SAMSUNG_WALLET_CARD_SUB_TYPE`
- `SAMSUNG_WALLET_CERTIFICATE_ID`
- `SAMSUNG_WALLET_COUNTRY_CODE`
- `SAMSUNG_WALLET_ENV`
- `SAMSUNG_WALLET_ADD_FLOW`
- `SAMSUNG_WALLET_PRIVATE_KEY_PEM`
- `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM`
- `SAMSUNG_WALLET_RD_CLICK_URL`
- `SAMSUNG_WALLET_RD_IMPRESSION_URL`
- `SAMSUNG_WALLET_PARTNER_SERVER_URL`
- `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH`

Serverseitige Dateien:

- `supabase/functions/_shared/samsungWalletProvider.ts`
- `supabase/functions/_shared/walletProviderRegistry.ts`
- `supabase/functions/samsung-wallet-add-link/index.ts`
- `supabase/functions/samsung-wallet-server/index.ts`
- `supabase/functions/update-samsung-wallet-pass/index.ts`
- `supabase/schema.sql` mit `samsung_wallet_instances` und `samsung_wallet_events`

Für Produktion muss `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` aus dem Samsung-Zertifikat/Public-Key der Partner-Konsole gesetzt sein. Zusätzlich muss `SAMSUNG_WALLET_PRIVATE_KEY_PEM` zum Samsung-Partner-Zertifikat passen. `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` ist nur ein Sandbox-Debug-Fallback und darf nicht produktiv verwendet werden.

## 5. Public URLs

Aktuelle lokale Defaults:

- Webapp Domain: `http://localhost:3000`
- API Base URL: `http://localhost:3000`
- Wallet Installationsseite: `/claim.html?template=<template_id>`

Konfiguration:

- `config.example.json -> app.baseUrl`
- `config.example.json -> app.apiBaseUrl`
- `config.example.json -> appleWalletDirect.webServiceBaseUrl`
- `config.example.json -> publicUrls.appPublicBaseUrl` als Platzhalter für das Edge Secret `APP_PUBLIC_BASE_URL`

Produktiv noch einzutragen:

- Domain der Webapp, z. B. `https://app.deine-domain.ch`
- Supabase Function Base URL, z. B. `https://<PROJECT_REF>.supabase.co/functions/v1`
- Apple Wallet Web Service URL, z. B. `https://<PROJECT_REF>.supabase.co/functions/v1/apple-wallet-webservice`
- Wallet Installationsseite, z. B. `https://app.deine-domain.ch/claim.html`
- Edge Functions müssen für direkte Wallets deployed sein: `claim-card`, `claim-apple-pass`, `apple-wallet-webservice`, Apple-/Google-Issue/Update/Send-Functions, `generate-card-pdf`, Notification-Functions, Queue-/Scheduled-Processor, `scanner-actions` und `get-business-scan-statistics`.
- `supabase/config.toml` setzt `verify_jwt = false` für `claim-card`, `claim-apple-pass`, `google-wallet-save-link`, `create-topup-payment-session`, `confirm-topup-payment`, `apple-wallet-webservice`, `process-scheduled-wallet-notifications` und `process-wallet-update-queue`, weil diese per oeffentlichem Claim, Topup-Claim-Key, Payment-Webhook-Secret, ApplePass-Header oder `WALLET_CRON_SECRET` statt zwingend per Supabase-User-JWT aufgerufen werden. `scripts/verify-supabase-edge-jwt-policy.js` prüft in `pnpm check`, dass genau diese No-JWT-Liste gilt, Betreiber-Functions nicht versehentlich öffentlich werden und die öffentlichen/Cron-/Webhook-Functions ihre eigenen Claim-, ApplePass-, Payment-Secret- oder Cron-Guards behalten.
- `claim-card` verlangt einen nicht leeren `walletObjectId` und gibt sonst `CLAIM_WALLET_OBJECT_ID_REQUIRED` zurück. Edge Function, lokaler Fallback und SQL begrenzen den öffentlichen Claim-Schlüssel auf maximal 180 Zeichen und erlauben nur Buchstaben, Zahlen, Punkt, Unterstrich, Bindestrich und Doppelpunkt; ungültige Werte liefern `CLAIM_WALLET_OBJECT_ID_INVALID`. Dieser Browser-Claim-Schlüssel macht die öffentliche Kartenerstellung idempotent und wird später von `claim-apple-pass` bzw. `google-wallet-save-link` erneut geprüft.
- `claim-card` und der lokale `/api/cards/claim`-Fallback prüfen jetzt auch den `card_instances`-Insert und die `card_events`-Inserts. Wenn die Kundenkarte angelegt wurde, aber Karteninstanz oder Claim-Event nicht gespeichert werden können, antwortet der jeweilige Pfad strukturiert mit `CLAIM_CARD_INSTANCE_SAVE_FAILED` oder `CLAIM_CARD_EVENT_SAVE_FAILED`, statt einen unvollständigen Claim als erfolgreich zu melden.
- `claim-card` lädt aktive Templates im öffentlichen Claim-Pfad mit einer expliziten internen Feldliste statt `*`; der lokale `/api/cards/claim`-Fallback nutzt ebenfalls explizite Template-Select-Listen. Beide geben für öffentliche Claims nur ein reduziertes Kartenobjekt zurück: Karten-ID, Template-ID, Karten-/Kundencode, Wallet-Plattform/-Schlüssel und harmlose Status-/Guthabenfelder. Interne Betreiber-/Business-IDs und Apple-`pass_authentication_token` bleiben serverseitig.
- Die nachgelagerten öffentlichen Wallet-Installationspfade `claim-apple-pass` und `google-wallet-save-link` laden Pass-Versionen, Karteninstanzen, Kundenkarten, Templates und Google-Wallet-Object-Zuordnungen ebenfalls über explizite Select-Listen. Rohe `*`-Relationen wie `card_templates(*)` oder `customer_cards(*)` sind dort per Check blockiert.
- `create-topup-payment-session` verlangt öffentlich neben der Karten-ID den stabilen Claim-/Wallet-Schlüssel (`walletObjectId`) aus dem aktuellen Browser-Claim. Akzeptiert werden der gespeicherte `wallet_object_id`, `wallet_serial_number` oder `metadata.google_wallet_claim_key`; fehlende, ungültige oder fremde Schlüssel werden mit `TOPUP_CLAIM_KEY_REQUIRED`, `TOPUP_CLAIM_KEY_INVALID` oder `TOPUP_CLAIM_KEY_MISMATCH` abgelehnt.
- `create-topup-payment-session` gibt öffentlich ebenfalls nur eine minimierte `topup_payment_session` zurück: ID, Betrag, Währung, Status, Checkout-URL, Provider-Setup-Hinweis und Zeitstempel. Kundenkarte, Template und Topup-Session werden intern mit expliziten Select-Listen geladen; rohe `card_templates(*)` oder Session-`*`-Selects sind per Check blockiert. Interne Betreiber-/Business-IDs, Karteninstanz-IDs, Provider-Session-IDs und Metadaten bleiben serverseitig. Vor dem Insert muss eine echte `card_instances`-Zeile über `customer_card_id`, `owner_id`, `business_id` und `template_id` gefunden werden; fehlt diese Zuordnung, liefert die Function `TOPUP_CARD_INSTANCE_REQUIRED`, damit keine Topup-Session ohne Wallet-/Karteninstanzbezug entsteht. Persistenzfehler beim Session-Insert werden als `TOPUP_SESSION_SAVE_FAILED` gemeldet.
- `confirm-topup-payment` lädt die pending Session, die verknüpfte Kundenkarte, das Template und die nach der RPC aktualisierte Karte ebenfalls mit expliziten Select-Listen. Die Function akzeptiert entweder einen eingeloggten freigeschalteten Betreiber oder einen Provider-Webhook mit Header `x-payment-webhook-secret`; `PAYMENT_WEBHOOK_SECRET` muss mindestens 32 Zeichen lang sein und wird hashbasiert timing-safe verglichen. Die Edge-Antwort nutzt weiter `publicOperatorCard(updatedCard)`, sodass keine `pass_authentication_token`, Owner-/Business-Rohfelder oder komplette Sessionzeilen an Browser bzw. Webhook-Caller zurückgegeben werden.
- `redeem-balance` lädt Kundenkarte und Template für die Vorabprüfung und die aktualisierte Antwort ebenfalls mit expliziten Select-Listen. Die Abbuchung selbst bleibt in `redeem_card_balance(...)` atomar; die Edge-Antwort nutzt `publicOperatorCard(updatedCard)`, sodass keine `pass_authentication_token`, Owner-/Business-Rohfelder oder komplette Template-Zeilen an Browser-Clients zurückgegeben werden.
- Der lokale `/api/cards/claim`-Fallback verlangt denselben stabilen `walletObjectId`, sucht bestehende Karten plattformweit über `wallet_platform + wallet_object_id` und für Google zusätzlich über `metadata.google_wallet_claim_key`. Dadurch bleiben lokale Tests auch nach Normalisierung auf eine echte Google Object ID idempotent, recovern parallele SQL-Unique-Konflikte als `reused` und blockieren Template-Konflikte mit `CLAIM_WALLET_OBJECT_ID_CONFLICT`.
- Die öffentliche Claim-Seite hat einen Hauptbutton `Zu Wallet hinzufügen`, der über `detectWalletDevice(...)` Apple, Samsung oder Google auswählt; die Provider-Buttons bleiben manuell verfügbar. Ausgegebene Kartenwerte, Währung und Auflade-Attribute werden mit `escapeHtml` escaped. Google-Save-Links werden vor dem Rendern mit `safeGoogleWalletSaveUrl(...)` auf `https://pay.google.com/gp/v/save/...` validiert. Samsung-Add-Links werden mit `safeSamsungWalletAddUrl(...)` auf `https://a.swallet.link/atw/v3/...#Clip?pdata=...` validiert. Dadurch kann ein fehlerhafter oder manipulierter Claim-/Wallet-Response nicht direkt als unsicheres `href` oder HTML in die mobile Seite gelangen.
- `process-wallet-update-queue` claimt Queue-Jobs atomar nur, wenn `id`, `owner_id`, `business_id`, `status = pending` und `next_attempt_at <= now` oder `next_attempt_at is null` noch zusammenpassen. Dadurch gelten Pending-Jobs ohne Zeitstempel als sofort fällig, während parallele Worker keine verschobenen Retries, fremde Business-Jobs oder manipulierte Karten-/Plattform-Zuordnungen verfrüht verarbeiten können. Danach wird die geladene `card_instance` zusätzlich gegen `job.owner_id`, `job.business_id`, `job.card_instance_id` und `job.wallet_platform` geprüft. Retry-fähige Providerfehler werden einheitlich mit 15, 30 und maximal 60 Minuten Backoff über `next_attempt_at` geplant. Nach erfolgreicher Queue-Finalisierung werden spätere Audit-/State-Sync-Fehler nur noch als `queue_post_finalize_error` oder `queue_card_wallet_state_sync_failed` protokolliert und lösen keinen zweiten Provider-Aufruf aus. Fehlende Google Object IDs sind strukturierte, nicht retry-fähige Queue-Setup-Fehler (`QUEUE_GOOGLE_OBJECT_ID_MISSING`). Die Edge-Response gibt für Queue-Jobs nur minimierte Provider-Zusammenfassungen zurück; rohe APNS-/Google-Responses bleiben serverseitig in `wallet_push_logs`.
- Apple-Pass-Updates, die eine neue Pass-Version vorbereiten, prüfen jetzt auch den Insert in `wallet_update_queue`. Wenn Supabase den Queue-Job ablehnt, wird `APPLE_WALLET_QUEUE_INSERT_FAILED` gemeldet, statt dem Betreiber fälschlich `queued` zu zeigen. SQL erzwingt für neue Queue-Jobs zusätzlich Snake-Case-`update_type` und JSON-Objekt-Payloads unter 20 KB.

## 6. Design und Editor-Struktur

Logo-/Bildfelder:

- Business-Logo: `businesses.logo_url`
- Karten-Icon/Bild: `card_templates.logo_url`
- Stempel-Icon: `card_templates.settings.stampIconUrl`
- Streak-Icon: `card_templates.settings.streakIconUrl`
- Event-Hintergrundbild: `card_templates.settings.eventBackgroundImageUrl`

Kartenvorschau:

- `public/js/ui.js -> walletPreviewHtml(...)`
- Editor nutzt Live-Vorschau in `public/js/editor.js`
- Claim-Seite nutzt dieselbe Vorschau in `public/js/claim.js`

Technisch vorhandene Template-Typen für Matrix, Bestandskarten und Wallet-Kompatibilität:

- `generic_card`
- `stamp_card`
- `streak_card`
- `vip_card`
- `balance_card`
- `cloakroom_card`
- `event_card`
- `coupon_card`
- `membership_card`
- `club_card`

Sichtbare Neuanlage-Typen im Editor:

- `generic_card`
- `stamp_card`
- `streak_card`
- `event_card`
- `club_card`

`vip_card`, `balance_card`, `cloakroom_card`, `coupon_card` und `membership_card` bleiben technisch für bestehende Karten erhalten, werden im Editor aber nicht mehr als neue Kartentypen angeboten. Ihre Funktionen werden über `club_card.club_features` als VIP-, Guthaben-, Garderoben-, Coupon- und Mitgliedschaftsmodul aktiviert.

Bestehende QR/PDF-Komponenten:

- QR im Dashboard: `public/js/dashboard.js`
- QR im Editor: `public/js/editor.js`
- QR API lokal: `GET /api/qrcode`
- QR PDF lokal: `GET /api/templates/:templateId/qr.pdf?format=a4|a5`
- PDF-Generator: `server/pdf.js`
- Edge PDF Function: `supabase/functions/generate-card-pdf/index.ts`; produktiv mit Betreiber-Auth, `operator_profiles.unlock`, `owner_id`-Filter auf `card_templates` und expliziter Template-Feldliste statt `*`

## 7. Versandregeln

Aktuelle Defaults in `walletNotificationService`:

- Max. Nachrichten pro Business/Tag: `WALLET_BUSINESS_DAILY_LIMIT`, Default `500`
- Max. Nachrichten pro Kunde/Tag: `WALLET_CUSTOMER_DAILY_LIMIT`, Default `12`; gruppiert über `card_instances.customer_id`, wenn vorhanden, sonst über die verknüpfte `customer_card_id`.
- Max. Nachrichten pro Karte/Tag: `WALLET_CARD_DAILY_LIMIT`, Default `6`
- Google `TEXT_AND_NOTIFY` pro Pass/24h: `WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H`, Default `3`
- Deduplizierungsfenster für identische Kampagnen: `WALLET_DUPLICATE_WINDOW_MINUTES`, Default `10`
- Öffentliche Claim-/Wallet-Installationsanfragen pro Route und Client-Fingerprint: `WALLET_PUBLIC_CLAIM_RATE_LIMIT`, Default `80`
- Zeitfenster für öffentliche Claim-/Wallet-Installationslimits: `WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS`, Default `900`
- Die Business-/Kunden-/Kartenlimits zählen nur echte Wallet-Nachrichtenaktionen (`apple_pass_update`, manuelle Apple-Push-/Pass-Updates, `google_text_and_notify`, Google-Fallback-Messages und Google-Location-Object-Updates). Status `sent`, `prepared` und für manuelle Apple-Pass-Updates auch `queued` zählen; Claim-, Issue-, Download- und Queue-Sync-Logs bleiben reine Audit-Einträge und verbrauchen keine Nachrichtenlimits. `prepared` aktualisiert den Pass, erhöht aber nicht `notification_count_24h`, solange APNS keinen sichtbaren Push bestätigt hat.
- Die öffentlichen Edge-Pfade `claim-card`, `claim-apple-pass`, `google-wallet-save-link` und `create-topup-payment-session` verbrauchen vor Datenbank-Lesezugriff ein separates Rate Limit über `public_edge_rate_limits` und die Service-Role-RPC `consume_public_edge_rate_limit(...)`. Gespeichert wird nur ein SHA-256-Hash aus Route, Forwarded-IP, User-Agent und Sprache; Browserrollen bekommen keine Grants auf Tabelle oder RPC.
- Leere Nachrichten werden blockiert.
- Titel ist auf 1 bis 120 Zeichen begrenzt.
- Nachrichtentext ist auf 1 bis 500 Zeichen begrenzt.
- Identische Kampagnen desselben Business werden innerhalb von `WALLET_DUPLICATE_WINDOW_MINUTES` dedupliziert. Als identisch gelten Titel, Nachricht, Template, Zieltyp, Zielgruppenfilter, Versandart, geplanter Zeitpunkt und Standortparameter zusammen; unterschiedliche Stempelbereiche, VIP-Level oder Eventfilter werden nicht versehentlich blockiert.
- Kampagnen-Idempotency ist in Edge-Code und SQL auf `owner_id + business_id + idempotency_key` gescoped. Idempotency Keys für Kampagnen sind auf 200 Zeichen begrenzt. Dadurch blockiert ein Retry innerhalb desselben Businesses doppelte Kampagnen, kollidiert aber nicht mit einem gleichlautenden Key eines anderen Businesses desselben Betreibers. Parallele Requests, die am SQL-Unique-Index mit `23505` kollidieren, werden über `latestCampaignByIdempotency(...)` wieder auf die vorhandene Kampagne aufgelöst und als `idempotency_conflict_recovered` beantwortet. Inhaltlich identische Kampagnen innerhalb von `WALLET_DUPLICATE_WINDOW_MINUTES` werden als `campaign_duplicate_skipped` in `wallet_push_logs` an der wiederverwendeten Kampagne auditiert; dieser Audit-Log bleibt ausserhalb von `NOTIFICATION_LIMIT_ACTIONS` und `VISIBLE_NOTIFICATION_ACTIONS`.
- Der Editor hält pro aktuellem Kampagnenentwurf `walletNotificationIdempotency` mit Fingerprint und Idempotency-Key. Ein Browser-Retry nach Netzwerkfehler oder ein erneutes Absenden desselben Entwurfs sendet denselben `Idempotency-Key`; erst wenn sich Inhalt, Zielgruppe, Template, Versandart, Zeitpunkt oder Standort aendern, wird ein neuer Key erzeugt. Nach erfolgreicher Kampagnenerstellung wird der Key zurückgesetzt.
- Versand und Fehler werden in `wallet_push_logs` protokolliert. Zentrale Kampagnen-/Queue-Logs sowie direkte Apple-/Google-Issue-, Claim-, Save-Link-, Send- und Update-Logs prüfen den Supabase-Insert auf Fehler und liefern `WALLET_PUSH_LOG_INSERT_FAILED`, statt fehlende Audit-Trails still zu verschlucken.
- Die Editor-Versandhistorie liest aus `wallet_notification_campaigns`, `wallet_notification_recipients` und `wallet_push_logs` nur minimierte Felder: Kampagnen-Metadaten, Status, Plattform, Action, Fehlercode, Fehlermeldung und Zeitpunkte. Die SQL-Rechte für `authenticated` sind auf diese sicheren History-Spalten und sichere Queue-Statusspalten begrenzt; rohe `target_filter`, `provider_response`, `request_payload`, `response_payload` und Queue-`payload` bleiben serverseitig für Edge Functions, Service Role und gezielte Admin-Debugging-Abfragen. Dadurch sind Empfängerstatus, Provider-Fehler, Plattform-Fallbacks und Audit-Probleme pro Kampagne sichtbar, ohne rohe Provider-/Audit-Payloads in den Browser zu laden.
- Die SQL-Rechte für `authenticated` begrenzen auch andere Wallet-Tabellen auf Browser-sichere Spalten. `customer_cards.pass_authentication_token`, direkte Browser-Updates auf `customer_cards`, direkte `card_instances`-Writes, direkte Updates auf `wallet_notification_campaigns`, direkte Updates auf `wallet_update_jobs`, direkte Inserts/Updates auf `wallet_device_registrations`, direkte Inserts auf `card_events`, direkte Inserts/Updates auf `balance_transactions` und `topup_payment_sessions`, Apple-Registrierungs-Hashes, Device-Push-Token, rohe Apple-Pass-JSON/Assets, Google-`save_url`, Legacy-Job-`details` und rohe Queue-/Provider-Payloads sind nur für serverseitige Edge Functions, SQL-Trigger, RPCs bzw. Service Role gedacht. Dashboard, Editor, Scanner und Reichweitenvorschau laden Profil-, Business-, Template-, Kunden- und Karteninstanzdaten deshalb mit expliziten Select-Listen statt `*`; `scripts/verify-browser-secret-boundary.js` blockiert neue Browser-Wildcard-Selects.
- Kampagnen und manuelle Apple-/Google-Sends aktualisieren nach dem Log konsistent `last_wallet_update_at`, bei sichtbarer Nachricht `last_notification_at` und den aus sichtbaren `wallet_push_logs` berechneten `notification_count_24h`. Dafür gibt es getrennte Action-Listen: `NOTIFICATION_LIMIT_ACTIONS` für Spam-/Tageslimits und `VISIBLE_NOTIFICATION_ACTIONS` nur für den sichtbaren, owner-/business-gefilterten Kartenzähler. Fehler oder fehlende Zeilentreffer beim Schreiben dieser Kartenstatusfelder werden sichtbar, statt still übergangen zu werden: manuelle Pfade antworten mit `CARD_WALLET_STATE_UPDATE_FAILED`, Kampagnen schreiben nach bereits persistiertem Provider-/Empfängerstatus einen separaten `card_wallet_state_sync_failed` Audit-Log.
- `create-wallet-notification-campaign` startet Sofort-Kampagnen direkt und gibt danach das neu geladene Kampagnenobjekt mit finalem Status plus `send_result` zurück. Der Editor zeigt dadurch nicht mehr den veralteten Zwischenstatus `sending`, sondern `sent`, `partially_failed` oder `failed`. `send_result` enthält für grosse Kampagnen eine kompakte `result_summary` und nur begrenzte, redigierte Ergebnisdetails; vollständige Providerantworten bleiben in `wallet_notification_recipients` und `wallet_push_logs`.
- Empfänger werden idempotent aufgelöst: bestehende `wallet_notification_recipients` werden nicht wieder auf `pending` gesetzt, wenn eine Kampagne erneut verarbeitet wird. Die separate `resolve-wallet-notification-recipients` Antwort gibt nur `recipients_count` und eine `recipient_summary` mit Status-/Plattformzählern zurück, nicht die rohen Empfängerzeilen. Empfängerlisten werden intern seitenweise gelesen und grosse Sofortkampagnen werden in wiederholten Pending-Batches verarbeitet, bis keine offenen Empfänger mehr übrig sind; dadurch stoppt der Versand nicht still nach der ersten Supabase-Antwortseite.
- Manuelle Apple-/Google-Sends, manuelle Apple-/Google-Updates sowie Apple- und Google-Issue-Endpunkte akzeptieren optional `idempotency-key` als Header oder Body-Feld. Wiederholte Requests für dieselbe Karte, Plattform und Aktion geben vor erneuter Limitprüfung, neuer Pass-Version, neuem Queue-Job, Google-Object-Patch oder Google-Issue-Provider-Aufruf den vorhandenen `wallet_push_logs`-Status zurück; Apple-Issue signiert die vorhandene Pass-Version erneut als `.pkpass`. Replay-Antworten aus `wallet_push_logs.response_payload` werden für manuelle Apple-/Google-Sends erneut provider-spezifisch minimiert: APNS-Details werden auf Zählwerte/Warncodes reduziert und Google-Providerantworten auf Status-, Action-, Object- und Fehlerfelder. Die vier manuellen Send-/Update-Pfade und die beiden Issue-Pfade reservieren einen neuen Idempotency-Key zuerst als `processing` in `wallet_push_logs` und aktualisieren danach genau diesen Log-Eintrag. Reservierung, Finalisierung und Fehlerabschluss sind an `owner_id`, `business_id`, `card_instance_id`, `wallet_platform` und `campaign_id is null` gebunden. Parallele Requests mit demselben Key erhalten dadurch `processing`/`reused`, statt Apple oder Google doppelt aufzurufen. Direkte manuelle Apple- und Google-Sends deduplizieren zusätzlich identische Nachrichtsinhalte innerhalb von `WALLET_DUPLICATE_WINDOW_MINUTES`: Der zweite Versuch wird als `manual_duplicate_skipped` geloggt und ruft keinen Wallet-Provider erneut auf. Wenn nach einer Reservierung ein unerwarteter Fehler passiert, wird derselbe Log-Eintrag als `failed` mit `reservation_failed_after_processing` abgeschlossen. Falls der Provider-/Audit-Schritt bereits finalisiert war, aber danach ein lokaler Persistenzschritt scheitert, wird derselbe Idempotency-Log mit `idempotency_post_finalize_failure` auf `failed` gesetzt; ein Retry bekommt dadurch keinen falschen Erfolgsstatus aus dem Cache. Manuelle Update-Payloads sind zusätzlich grössenbegrenzt und dürfen keine Wallet-Identitätsfelder wie Apple `passTypeIdentifier`/`authenticationToken` oder Google `object_id`/`classId`/`barcode` überschreiben. `wallet_push_logs_manual_idempotency_idx` erzwingt die eindeutige Zuordnung pro `owner_id`, `business_id`, `card_instance_id`, `wallet_platform`, `idempotency_scope` und Key.
- Die Edge Function `resolve-wallet-notification-recipients` lädt Kampagnen nur mit `owner_id` und aktueller `business_id`, damit ein Betreiber keine Empfänger eines anderen Business neu auflösen kann.
- `wallet_push_logs.wallet_platform` unterscheidet Provider-Logs (`apple`/`google`) von kampagnenweiten System-Audit-Logs ohne Karteninstanz (`system`). Dadurch erscheinen `resolve_recipients` ohne Treffer oder `scheduled_campaign_failed` nicht mehr künstlich als Apple-Ereignis; bei Logs mit `card_instance_id` erzwingt der SQL-Trigger weiterhin die echte Kartenplattform.
- Beim Senden wird jeder Empfänger atomar von `pending` auf `processing` gesetzt; parallele Aufrufe überspringen bereits geclaimte Empfänger, statt Apple/Google doppelt aufzurufen. Diese parallelen Skips werden als `recipient_already_claimed` in `wallet_push_logs` auditiert, ohne den gerade laufenden Empfängerstatus zu überschreiben.
- Kampagnenstatus und Empfängerzählung werden beim Versand nur mit passendem `owner_id`, `business_id` und `campaign_id` aktualisiert. Auch der Zwischenstatus `sending` wird nicht mehr nur per Kampagnen-ID gesetzt; der Start des Versands muss eine passende sendbare Kampagnenzeile treffen, sonst antwortet der Service mit `CAMPAIGN_SEND_START_CONFLICT`.
- Beim Senden werden Empfänger erneut gegen `owner_id`, `business_id` und `campaign_id` der Kampagne geprüft. Die nachgeladene `card_instance` muss zum Business, optional zum Kampagnen-Template und zur gespeicherten Wallet-Plattform passen; Mismatches werden geloggt und nicht an Apple/Google gesendet. Direkt vor dem Provider-Aufruf wird die Karte zusätzlich erneut gegen `notifications`, `target_type` und `target_filter` geprüft; falls sich eine geplante Kampagne durch spätere Karten-/Template-Aenderungen nicht mehr deckt, wird der Empfänger mit `RECIPIENT_NOTIFICATIONS_DISABLED` oder `RECIPIENT_TARGET_MISMATCH` übersprungen. `card_instances.push_enabled = false` ist ein hartes Push-Opt-out: Resolve schliesst diese Karten aus, Preflight zählt sie als nicht erreichbar, und bereits vorhandene/manipulierte Empfänger werden beim finalen Send als `PUSH_DISABLED` mit Status `skipped` geloggt. Das finale Empfängerstatus-Update ist ebenfalls an `owner_id`, `business_id`, `campaign_id`, `card_instance_id`, `wallet_platform` und einen offenen Status (`pending` oder `processing`) gebunden. Direkte Operator-Functions für Issue, Update, Push und Limit-Preflight filtern `card_instances` bzw. `google_wallet_objects` ebenfalls nach `owner_id` und aktueller `business_id`.
- Die Matrix erlaubt `notifications` für alle aktuellen Template-Typen, aber ein einzelnes Template kann Benachrichtigungen über `settings.notificationsEnabled = false` oder `settings.features.notifications = false` explizit abschalten. Browser-Helfer, Edge-Helfer und SQL `template_feature_allowed(...)` respektieren dieses Opt-out.
- Wählt der Betreiber im Editor ein Template mit deaktivierten Benachrichtigungen, bleibt der Wallet-Benachrichtigungsbereich sichtbar, aber alle Sendefelder ausser dem Template-Dropdown werden gesperrt und eine Hinweismeldung erklärt den Grund. Dadurch kann der Betreiber direkt auf businessweite Benachrichtigungen oder ein anderes Template wechseln, während Edge-Preflight, Empfänger-Resolve und SQL-Trigger weiterhin autoritativ blockieren.
- `supabase/schema.sql` ergänzt diese Checks datenmodellseitig mit Konsistenz-Triggern für `wallet_notification_campaigns`, `wallet_notification_recipients`, `wallet_push_logs`, `wallet_update_queue`, `apple_wallet_registrations`, `apple_pass_versions` und `google_wallet_objects`. Dadurch blockiert Supabase auch bei Service-Role- oder Cron-Pfaden manipulierte `business_id`, `template_id`, `card_instance_id` oder Wallet-Plattform-Zuordnungen. Kampagnen-Trigger prüfen zusätzlich Template-Zielgruppen, `notifications`, featurebasierte Zielgruppen gegen `template_feature_allowed(...)` sowie `target_filter` als Objekt mit 2000-Zeichen-Limit. Filterfelder werden target-spezifisch erlaubt: Datumsfilter allgemein, `min/max` nur für Stempel/Streak, Guthabenfilter nur für `balance_range`, VIP-, Event- und Membership-Felder nur für die passende Zielgruppe. Nicht-negative Min-/Max-Werte, ISO-Datumsbereiche und Textlängen werden danach validiert. Kampagnen-Identitätsfelder wie `owner_id`, `business_id`, `created_by`, `created_at` und `idempotency_key` sind nach dem Insert unveränderlich. Audit-Logs dürfen ohne Karteninstanz als `system` geschrieben werden, wenn sie nur eine Kampagne betreffen; sobald Kampagne oder Karteninstanz gesetzt sind, werden sie gegen Betreiber, Business, Template und bei Karteninstanzen gegen die echte Plattform validiert. Neue Audit-Logs brauchen ausserdem Snake-Case-`action`, einen bekannten strukturierten `status` und JSON-Objekt-Payloads unter 20 KB; die Constraints sind `not valid`, damit alte Log-Historie beim Setup nicht gescannt wird, neue Datensätze aber sauber bleiben.
- `customer_cards` und `card_instances` validieren jetzt im selben Feature-Trigger zusätzlich, dass `owner_id`, `business_id`, `template_id` und die optionale `customer_card_id` zusammenpassen. Damit können auch Service-Role-/Claim-/Scanner-Pfade keine Kundenkarte oder Karteninstanz auf ein fremdes Template oder Business zeigen lassen.
- `card_events` prüft jetzt auch neutrale Events ohne Featurebindung, z. B. Claim- oder Wallet-Installationslogs, gegen das referenzierte Business, Template und die Kundenkarte. Dadurch kann kein Service-Role-/Edge-Pfad eine Eventzeile auf eine fremde `customer_card_id` oder ein fremdes Template zeigen lassen, selbst wenn der Eventtyp nicht in der Feature-Matrix steckt. Neue Eventtypen müssen ein kurzes Lowercase-Format nutzen, `details` muss ein JSON-Objekt unter 20 KB bleiben. Direkte Browser-Inserts sind deaktiviert; Audit-Events entstehen über Claim-/Scanner-/Wallet-Functions, RPCs oder Service-Role-Pfade.
- Hängende `processing`-Empfänger werden beim nächsten Send-Lauf nach `WALLET_RECIPIENT_PROCESSING_TIMEOUT_MINUTES`, Default `15`, wieder auf `pending` gesetzt.
- Der Editor ruft `check-wallet-notification-limits` als Preflight für die aktuelle Zielgruppe auf und zeigt Google-Limits, Business-/Kunden-/Kartenlimits sowie Apple-Karten ohne registriertes Gerät vor dem Versand an. Einzelkarten-Limitprüfungen laden `card_instances` nur mit einer expliziten Limit-Feldliste, und `resolve-wallet-notification-recipients` lädt Kampagnen nur mit den Feldern für Zielgruppe, Filter, Versandart und Status. Edge-Preflight und Kampagnen-Resolve laden `card_instances` seitenweise, damit Betreiber mit mehr als 1'000 Wallet-Karten nicht durch ein statisches Supabase-Antwortlimit abgeschnitten werden. Die Apple-Registrierungszählung filtert trotz Service Role nach `owner_id`, `business_id` und `card_instance_id`, damit fremde Device-Registrierungen nie in die Reichweitenanzeige einlaufen. Die sichtbaren Reichweitenzähler werden nach erfolgreichem Preflight aus `allowed_count`, `unreachable_count`, `push_disabled_count`, `limited_count`, `apple_count`, `google_count` und `apple_unregistered_count` aktualisiert. Die Warnbox trennt deaktivierte Push-Karten (`PUSH_DISABLED`), sonstige technische Nicht-Erreichbarkeit, Plattformlimits und Apple-Registrierungsfallbacks, damit Betreiber vor dem Versand sehen, warum Empfänger nicht direkt benachrichtigt werden. Das Business- und Kunden-Tageslimit wird dabei als Restkontingent für die gesamte Empfängerauswahl simuliert, nicht nur einzeln pro Karte geprüft. Der optionale Zeitraum im Editor schreibt `target_filter.activeFrom`/`activeUntil`; lokale Vorschau, Edge-Preflight und Kampagnen-Resolve nutzen denselben Kartenzeitraum. Direkt beim Submit wird der Preflight mit dem aktuellen Formularstand inklusive geplanter Zeit und Standortdaten erneut ausgeführt; Null-Reichweite, ungültige `scheduled`/`location_based` Felder und Sofortversand ohne erlaubte Empfänger werden vor dem Kampagnen-Create gestoppt.
- `scripts/verify-responsive-layout.js` läuft in `pnpm check` und sichert den mobilen Editor-/Wallet-Bereich ab: Viewport-Meta, einspaltige Wallet-Benachrichtigungen unter 860px, kompakte Historienzeilen unter 560px und Umbruch langer Warn-/Providertexte.
- `scripts/verify-deploy-cleanliness.js` läuft in `pnpm check` und blockiert lokale `.DS_Store`-Artefakte in Quell-/Supabase-Verzeichnissen sowie den alten `supabase/functions/passkit` Ordner.
- `scripts/verify-wallet-architecture-contract.js` läuft ebenfalls in `pnpm check` und sichert die explizit geforderten Methodennamen von `walletNotificationService`, `appleWalletProvider` und `googleWalletProvider` sowie die Apple-Webservice-Routen und Google-Wallet-Object-Typen ab.
- `scripts/verify-editor-history-redaction.js` läuft in `pnpm check` und prüft direkt gegen die Editor-Helfer, dass Save-Links, JWTs und Auth-/Push-Token in der Historienanzeige redigiert werden.
- `scripts/verify-supabase-edge-jwt-policy.js` läuft in `pnpm check` und sichert die Supabase-Edge-JWT-Policy ab: nur Claim-, Topup-, Payment-Webhook-, Apple-Webservice- und Cron-Pfade dürfen `verify_jwt=false` haben; Operator-Wallet-Functions müssen `walletNotificationService.context(request)` verwenden und `generate-card-pdf` muss Betreiber-Auth plus `owner_id`-Templatefilter behalten.
- `scripts/verify-supabase-schema-sanity.js` läuft in `pnpm check` und schützt `supabase/schema.sql` gegen nicht abgeschlossene Statements, doppelte Tabellenspalten und kaputte `INSERT`-Spaltenlisten.
- `scripts/verify-edge-typescript-syntax.js` läuft in `pnpm check` und prüft alle Supabase Edge TypeScript-Dateien syntaktisch per lokalem `--experimental-strip-types --check`, falls verfügbar, sonst per strukturellem Fallback.
- `scripts/verify-edge-function-contracts.js` läuft in `pnpm check` und prüft alle Supabase Edge Functions auf `Deno.serve`, CORS/OPTIONS, strukturierte Fehler, Auth-Kontext, Service-Role-Client-Schutz und Idempotency-Reservierung bei manuellen Wallet-Operationen.
- `scripts/verify-wallet-target-contract.js` läuft in `pnpm check` und hält Wallet-Zielgruppen sowie erlaubte `target_filter` Felder zwischen `config.example.json`, Editor, Edge Backend und SQL synchron.
- `scripts/verify-wallet-limit-accounting.js` läuft in `pnpm check` und schützt die Trennung zwischen `NOTIFICATION_LIMIT_ACTIONS`, `VISIBLE_NOTIFICATION_ACTIONS`, Google-Fallbacks und `notification_count_24h`, damit Fallback-Kartenupdates zwar Tageslimits verbrauchen können, aber nicht als sichtbare Google-Pushs gezählt werden.
- `scripts/verify-editor-campaign-idempotency.js` läuft in `pnpm check` und schützt die Editor-seitige Wiederverwendung des Kampagnen-Idempotency-Keys für Browser-Retry-Situationen.
- `scripts/verify-claim-page-output-safety.js` läuft in `pnpm check` und schützt das Escaping der öffentlichen Claim-Ausgabe sowie die Validierung von Google-Wallet-Save-Links.
- `scripts/verify-public-edge-response-safety.js` läuft in `pnpm check` und schützt öffentliche Claim-/Topup-Responses, browsernahe Scanner-/Guthaben-Responses, Apple-Pass-Versionen, Idempotency-Replay-Payloads, Queue-Processor-Antworten und den lokalen Claim-/Scanner-Fallback vor rohen Datenbankzeilen mit internen Betreiber-, Business-, Karteninstanz- oder Providerfeldern.
- `scripts/verify-apple-webservice-contract.js` läuft in `pnpm check` und schützt Apple Wallet Web Service Routen, ApplePass-Auth, Changed-Serials, Pass-Download-Cache und Push-Token-Redaction.
- `scripts/verify-google-wallet-contract.js` läuft in `pnpm check` und schützt Google Wallet Provider, Service-Account-JSON, Save-Link-Redaction, Object-Type-Mapping, `TEXT_AND_NOTIFY`, Fallbacks, SQL-Isolation und Limits.
- `scripts/verify-wallet-requirements-coverage.js` läuft in `pnpm check` und gleicht die grossen Prompt-Blöcke gegen Code, SQL, Editor-UI, Secrets, Testdaten und Legacy-PassKit-Archivhinweise ab.
- `scripts/verify-wallet-goal-audit.js` läuft in `pnpm check` und prüft `docs/WALLET_GOAL_COMPLETION_AUDIT.md`, damit repo-seitige Evidenz und externe Apple-/Google-/Supabase-Abnahmegates sichtbar bleiben.
- `scripts/verify-wallet-external-acceptance.js` läuft in `pnpm check` und prüft `docs/WALLET_EXTERNAL_ACCEPTANCE.md`, damit die produktive Apple-/Google-/Cron-/Payment-Abnahme konkrete Nachweise nennt.
- `scripts/wallet-readiness-report.js` kann vor der externen Abnahme lokal ausgeführt werden. Es prüft Config-, URL-, Secret- und Edge-Function-Status, gibt aber nur redigierte Statusmeldungen und keine Secret-Werte aus.
- `scripts/wallet-acceptance-audit.js` kann nach echten Provider-/Cron-/Payment-Aktionen laufen und prüft redigierte Nachweiszähler für Apple-Registrierungen, Pass-Versionen, Google-Objects, Kampagnen, Empfänger, Queue, optionale Topups und Business-Isolation.
- `scripts/verify-supabase-secrets-template.js` prüft `supabase/secrets.example.env`, damit Apple-/Google-/Supabase-/Payment-/Cron-/Limit-Secrets vollständig bleiben, `supabase/secrets.local.env` ignoriert wird und keine echten PEM-/JWT-/Key-Muster in der Vorlage stehen.
- `supabase/acceptance-queries.sql` kann nach echten Wallet-/Cron-/Payment-Aktionen im Supabase SQL Editor laufen und liefert Nachweise für Apple-Registrierungen, Pass-Versionen, Google-Objects, Wallet-Logs, Kampagnenstatus, Queue/Cron, Topups und Kontext-Mismatches.
- `scripts/verify-wallet-implementation-plan.js` läuft in `pnpm check` und prüft `docs/WALLET_IMPLEMENTATION_PLAN.md`, damit Analyse, Dateirollen, SQL-Migrationsplan, Edge-Function-Plan und Secret-Checkliste sichtbar bleiben.
- `scripts/verify-edge-function-imports.js` läuft in `pnpm check` und prüft, dass Supabase Edge Functions nur lokal auflösbare Shared-Dateien oder erlaubte `esm.sh` Remote-Imports verwenden und keine PassKit-Referenzen reaktivieren.
- `scripts/verify-wallet-cron-setup.js` läuft in `pnpm check` und prüft `docs/WALLET_CRON_SETUP.md` sowie `supabase/cron.example.sql`, damit `process-scheduled-wallet-notifications` und `process-wallet-update-queue` produktiv per Cron vorbereitet bleiben.
- `scripts/verify-wallet-deploy-checklist.js` läuft in `pnpm check` und prüft, dass README, aktiver Kontext und `config.example.json` alle benötigten Apple-/Google-/Supabase-Secrets, Public URLs, Wallet-Deploy-Commands und Zielgruppen-Platzhalter enthalten.
- `scripts/verify-wallet-deploy-script.js` prüft `scripts/deploy-wallet-functions.sh`, damit der wiederholbare Edge-Function-Deploy alle Wallet Functions enthält, `_shared` auslässt, `supabase/config.toml` voraussetzt, die Project Ref aus `config.json -> supabase.url` ableiten kann, ohne globales `supabase` auf `pnpm dlx supabase`/`npx --yes supabase` ausweicht, Supabase-CLI-Auth vorab prüft und Dry-Run/Project-Ref/Only/Readiness/Auth-Check-Modi dokumentiert bleiben.
- Direkte Limit-Prüfungen für eine einzelne Karteninstanz nutzen standardmässig die gespeicherte `card_instances.wallet_platform`. Wenn ein Client `walletPlatform` explizit sendet, muss der Wert `apple` oder `google` sein und zur Karteninstanz passen. Die Limit-Zähler filtern zusätzlich nach `owner_id` und `business_id`, damit keine fremden Audit-Logs in Tageslimits einfliessen. Das Kundenlimit zählt Logs aller Karteninstanzen mit derselben `customer_id` oder, falls noch keine Endkundenidentität gesetzt ist, derselben `customer_card_id`.
- Der Editor unterstützt im Template-Dropdown auch `Alle Templates / businessweit`. Ohne ausgewähltes Template sind nur businessweite Zielgruppen wie `all_active`, `platform_apple` und `platform_google` sichtbar; featurebasierte Zielgruppen bleiben an ein konkretes Template gebunden. Reichweiten- und Historienabfragen filtern dabei weiterhin nach aktueller `business_id`.
- Geplante Kampagnen und Wallet-Queue-Jobs können betreiberseitig per Auth oder serverseitig per `WALLET_CRON_SECRET` verarbeitet werden. Das Cron Secret muss mindestens 32 Zeichen lang sein und wird in `automationContext` hashbasiert verglichen, statt per direktem Stringvergleich.
- `walletNotificationService.schedule()` plant nur Kampagnen im Status `draft` oder `scheduled`, prüft Business-Isolation, erlaubt nur `scheduled` oder `location_based`, validiert Pflichtfelder erneut und löst fehlende Empfänger vor dem Planen auf.
- `walletNotificationService.sendNow()` blockiert terminale Kampagnen (`sent`, `partially_failed`, `failed`, `cancelled`) und sendet geplante `scheduled`/`location_based` Kampagnen nur, wenn sie fällig sind. Zu frühe manuelle Aufrufe liefern `CAMPAIGN_NOT_DUE`. Fällige geplante und standortbasierte Kampagnen rufen vor dem Pending-Batch erneut `resolveRecipients(...)` auf, damit neue passende Karten aufgenommen werden, ohne bereits verarbeitete Empfänger wieder auf `pending` zu setzen.
- `walletNotificationService` nutzt für Betreiberprofile, Businesses, Templates, Kampagnen, Empfänger, Karteninstanzen, Kundenkarten, Google-Wallet-Objects und Queue-Jobs feste Select-Konstanten. Rohe `.select('*')`-Abfragen und Relation-Wildcards wie `card_templates(*)`, `customer_cards(*)`, `google_wallet_objects(*)` oder `businesses(*)` sind im Service per `scripts/verify-public-edge-response-safety.js` blockiert.
- `process-scheduled-wallet-notifications` verarbeitet fällige Kampagnen isoliert voneinander: Unerwartete Fehler einer Kampagne schliessen offene Empfänger als `failed` ab, finalisieren den Kampagnenstatus und werden als `scheduled_campaign_failed` in `wallet_push_logs` protokolliert, ohne den restlichen Cron-Lauf abzubrechen. Wenn der Fehlerabschluss keine passende geplante oder sendende Kampagnenzeile mehr trifft, meldet der Service `SCHEDULED_CAMPAIGN_FINALIZE_CONFLICT` statt einen stillen `failed`-Status vorzutäuschen. Die Function-Antwort reduziert erfolgreiche Kampagnen auf Status, `result_summary`, Batch-/Recovery-Zähler und Truncation-Info, damit Cron-Responses keine Empfänger-Detailflut ausgeben.
- Supabase Cron ruft `process-scheduled-wallet-notifications` und `process-wallet-update-queue` per `POST` auf und sendet entweder `Authorization: Bearer <WALLET_CRON_SECRET>` oder `x-cron-secret: <WALLET_CRON_SECRET>`.
- Für diese Cron-Functions ist `verify_jwt = false` in `supabase/config.toml` gesetzt; sonst würde Supabase den Cron-Request vor der eigenen Secret-Prüfung ablehnen.
- `wallet_update_queue`-Jobs werden vor dem Provider-Aufruf atomar von `pending` auf `processing` geclaimt und danach gegen die geladene `card_instance` validiert. Hängende Queue-Jobs werden nach `WALLET_QUEUE_PROCESSING_TIMEOUT_MINUTES`, Default `15`, wieder auf `pending` gesetzt. Jobs mit falscher Karten- oder Plattformzuordnung werden als nicht retrybare Manipulations-/Konsistenzfehler beendet. Strukturierte Providerfehler mit `ok: false` werden wie Exceptions bis zu drei Mal retrybar behandelt, sofern sie nicht zu bekannten nicht-retrybaren Payload-/Konsistenzfehlern gehören. Nach erfolgreichem Provider-Aufruf und Queue-Finalisierung dürfen spätere Audit-/Kartenstatus-Sync-Fehler keinen zweiten Provider-Aufruf und keinen Queue-Retry mehr auslösen; der Service schreibt stattdessen `queue_post_finalize_error` oder `queue_card_wallet_state_sync_failed`, soweit der Audit-Log noch möglich ist. Google-Queue-Jobs bevorzugen die gespeicherte `google_wallet_objects.object_id`/`object_type`-Zuordnung vor freien Payload-Werten; unbekannte Object-Typen und Patches auf `id`, `classId`, `object_id`, `issuer_id`, `accountId`, `kind` oder Barcode werden blockiert.
- Abschluss und Retry eines Queue-Jobs laufen über `finalizeQueueJobProcessing(...)` und aktualisieren den Datensatz nur, wenn `id`, `owner_id`, `business_id` und `status = processing` noch zusammenpassen. Wenn Supabase keinen passenden Job aktualisiert, wird `QUEUE_STATUS_UPDATE_CONFLICT` gemeldet, statt einen Provider-Aufruf als verarbeitet erscheinen zu lassen. Dadurch kann ein fremder, verschobener oder bereits anderweitig verarbeiteter Job nicht nachträglich überschrieben werden.
- Fachliche Updates an `customer_cards` schreiben weiterhin den lokalen Legacy-Job in `wallet_update_jobs`, synchronisieren `card_instances` im selben SQL-Trigger und legen danach einen direkten `wallet_update_queue`-Job an. Dadurch verarbeitet der Queue-Processor keine veralteten Stempel-, Streak-, VIP-, Guthaben- oder Garderobenwerte; vorhandene Scan-Zeitpunkte werden bei Updates ohne neuen Scan nicht gelöscht. Apple-Queue-Jobs erzeugen vor dem APNS-Push eine neue Pass-Version mit aktuellem Status; Google-Queue-Jobs aktualisieren das gespeicherte Wallet Object mit dem aktuellen Status-Patch, berühren danach die lokale `google_wallet_objects`-Zuordnung mit Betreiber-, Business-, Karten-, Template-, Object-ID- und Object-Type-Filtern und synchronisieren `card_instances.google_object_id`, `wallet_object_id` und `wallet_serial_number` auf dieselbe echte Google Object ID. Der Queue-Trigger berechnet `wallet_serial_number` plattformbewusst: Apple zuerst aus `pass_serial_number`, Google zuerst aus `wallet_object_id`. `redeem_card_balance(...)` und `confirm_card_topup(...)` synchronisieren `card_instances` ebenfalls plattformbewusst: Apple nutzt die Pass-Serial, Google behält `wallet_object_id`/`google_object_id` als Wallet Object Bezug. Erfolgreiche oder vorbereitete Queue-Syncs setzen `last_wallet_update_at`, ohne `last_notification_at` oder `notification_count_24h` zu erhöhen.
- `location_based` Kampagnen werden als best-effort verarbeitet: Apple Wallet bekommt `locations[].relevantText`; Google Wallet bekommt ein Object-Update ohne echten Standort-Push. Der Radius wird im Editor, Edge Backend und SQL einheitlich als ganzzahliger Wert von 50 bis 100000 Metern validiert.
- Der Preflight von `check-wallet-notification-limits` gibt bei `location_based` immer `LOCATION_BASED_BEST_EFFORT` zurück und weist getrennt auf `APPLE_LOCATION_RELEVANCE_DECIDED_BY_IOS` bzw. `GOOGLE_LOCATION_PUSH_NOT_SUPPORTED` hin, damit die UI keine falschen Standort-Push-Versprechen macht.

Platzhalter in `config.example.json -> deliveryRules`:

- `businessDailyLimit`
- `customerDailyLimit`
- `cardDailyLimit`
- `googleTextAndNotifyLimitPerPass24h`
- `duplicateWindowMinutes`
- `publicClaimRateLimit`
- `publicClaimRateLimitWindowSeconds`
- `recipientProcessingTimeoutMinutes`
- `queueProcessingTimeoutMinutes`
- `defaultTitle`
- `defaultMessage`
- `allowedTargets`

Der lokale `/api/config`-Endpunkt liefert nur nicht-sensitive Delivery-Rule-Felder an den Editor aus: Business-, Kunden- und Karten-Tageslimits, Google-`TEXT_AND_NOTIFY`-Limit, Deduplizierungsfenster, `defaultTitle`, `defaultMessage` und `allowedTargets`. PassKit-Felder, Apple-Secrets, Google-Service-Account-Daten und Service Role Keys bleiben serverseitig. Der Editor nutzt diese Werte für Standardtexte, die sichtbare Limit-Zusammenfassung und zur zusätzlichen UI-Einschränkung der Zielgruppen; die autoritative Validierung bleibt im Edge-Backend über `ALLOWED_TARGET_TYPES`, `walletLimitConfig()` und die Template-Feature-Matrix.

Erlaubte Zielgruppen:

- alle aktiven Karten
- alle Karten eines Templates
- nur Apple Wallet
- nur Google Wallet
- Stempelkarten nach Stempelstand
- Streakkarten nach Streak
- VIP-Level
- Guthabenbereich
- offene Garderobenabgaben
- Eventkarten nach Event-ID oder Eventname
- nicht eingelöste Coupons
- Mitgliedschaftsstatus

Matrix-Regeln:

- Stempel-Zielgruppen nur bei `stamp_card`
- Streak-Zielgruppen nur bei `streak_card`
- VIP-Zielgruppen nur bei `vip_card` oder aktivierter VIP-Funktion einer `club_card`
- Guthaben-Zielgruppen nur bei `balance_card` oder aktivierter Guthaben-Funktion einer `club_card`
- Garderoben-Zielgruppen nur bei `cloakroom_card` oder aktivierter Garderoben-Funktion einer `club_card`
- Event-Zielgruppen nur bei `event_card`; der Editor kann Eventkarten per Event-ID und/oder Eventname eingrenzen
- Coupon-Zielgruppen nur bei `coupon_card` oder aktivierter Coupon-Funktion einer `club_card`
- Membership-Zielgruppen nur bei `membership_card` oder aktivierter Mitgliedschafts-Funktion einer `club_card`

Backend-Filtervalidierung:

- `target_filter` muss ein JSON-Objekt sein und darf im MVP maximal 2000 Zeichen als JSON enthalten.
- Unbekannte Filterfelder werden mit `INVALID_TARGET_FILTER_FIELD` abgelehnt; bekannte, aber zur gewählten Zielgruppe unpassende Filterfelder werden mit `TARGET_FILTER_FIELD_NOT_ALLOWED_FOR_TARGET` bzw. datenbankseitig mit `CAMPAIGN_TARGET_FILTER_FIELD_FORBIDDEN` blockiert.
- Stempel-, Streak- und Guthabenbereiche werden serverseitig auf gültige nicht-negative Min-/Max-Werte geprüft.
- Datumsfilter müssen in Edge-Code und SQL gültige ISO-Zeitpunkte sein; Startdatum darf nicht nach Enddatum liegen.
- Textfilter für VIP-Level, Membership, Event-ID und Eventname sind längenbegrenzt.

## 8. Testdaten

`supabase/test-data.sql` legt nach Registrierung von `demo@example.com` folgende Demo-Struktur an:

- Demo-Business und freigeschalteter Demo-Betreiber
- Stempel-, VIP-, Guthaben-, Garderoben-, Event-, Coupon- und Clubkarten-Templates
- Apple- und Google-Testkarten mit eindeutigen `card_instances`
- Demo-Apple-Pass-Versionen mit `authenticationToken`, HTTPS-`webServiceURL`, QR-Barcode und sichtbaren Statusfeldern sowie Demo-Apple-Device plus `apple_wallet_registrations` für Apple-Preflight und Push-Fallbacktests
- Google-Wallet-Object-Datensätze pro `card_instance_id`, inklusive `genericObject`, `loyaltyObject`, `offerObject`, `eventTicketObject` und `giftCardObject`
- drei Beispielkampagnen mit vorbereiteten `wallet_notification_recipients`: sofort, geplant und Garderoben-Erinnerung

Offene externe Entscheidungen:

- Produktives Business-Tageslimit festlegen.
- Produktives Kunden-Tageslimit festlegen.
- Produktives Karten-Tageslimit festlegen.
- Standardtitel und Standardtexte für Kampagnen festlegen.
- Produktive Google-Wallet-Freigabe für Event Tickets, Loyalty, Offer und Generic Passes im Google-Wallet-Console-Prozess prüfen.
- Produktiven Cron für geplante Benachrichtigungen, standortbasierte Pass-Updates und Queue-Jobs aktivieren.
