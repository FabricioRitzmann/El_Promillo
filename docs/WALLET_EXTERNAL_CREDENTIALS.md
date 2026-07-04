# Wallet External Credentials

Stand: 2026-07-03

Diese Anleitung beschreibt die externen Werte, die für den echten Apple-Wallet- und Google-Wallet-Go-Live noch fehlen können. Keine echten Werte in diese Datei schreiben. Echte Secrets gehören nur in `supabase/secrets.local.env`, direkt in Supabase Secrets oder in nicht versionierte Dateien unter `certs/`.

Aktueller Zweck:

- Apple Wallet Pass-Zertifikate und lokale PEM-Dateien prüfen.
- Apple APNs `.p8` Auth Key vorbereiten.
- Google Wallet Issuer ID und Service Account JSON vorbereiten.
- Danach Supabase Secrets setzen und die lokalen Checks erneut laufen lassen.

Offizielle Referenzen:

- Apple Wallet Identifiers und Pass Type ID Certificate: https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates/
- Apple APNs Private Key erstellen: https://developer.apple.com/help/account/keys/create-a-private-key/
- Apple `.p8` Key erneut herunterladen bzw. Download-Regeln: https://developer.apple.com/help/account/keys/revoke-edit-and-download-keys/
- Apple Wallet Pass Web Service Updates: https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
- Google Wallet Issuer Onboarding: https://developers.google.com/wallet/generic/getting-started/issuer-onboarding
- Google Wallet REST API Credentials: https://developers.google.com/wallet/generic/getting-started/auth/rest
- Google Wallet Service Account Begriff: https://developers.google.com/wallet/generic/resources/terminology
- Google Issuer ID Hinweis: https://developers.google.com/wallet/smart-tap/introduction/collection-identifiers

## 1. Lokalen Ist-Stand prüfen

```bash
node scripts/wallet-credential-files-check.js --strict
node scripts/wallet-go-live-report.js --skip-remote
```

Erwartung, solange externe Werte fehlen:

- Apple WWDR Certificate: ok, wenn `certs/AppleWWDRCAG4.pem` lesbar ist.
- Apple Pass Certificate: ok, wenn `certs/pass-cert.pem` lesbar ist.
- Apple Pass Private Key: ok, wenn `certs/pass-key.pem` zum Pass-Zertifikat passt.
- Apple APNs: offen, bis `APPLE_APNS_KEY_ID` und `APPLE_APNS_AUTH_KEY` gesetzt sind.
- Google Wallet: offen, bis `GOOGLE_WALLET_ISSUER_ID` und `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` gesetzt sind.

## 2. Apple Pass Type ID und Pass-Zertifikat

Diese Werte sind für das Erstellen und Signieren der `.pkpass` Datei notwendig:

- `APPLE_TEAM_ID`
- `APPLE_PASS_TYPE_ID`
- `APPLE_WWDR_CERT`
- `APPLE_PASS_CERT`
- `APPLE_PASS_KEY`
- `APPLE_PASS_KEY_PASSWORD`
- `APPLE_WEB_SERVICE_BASE_URL`

Apple Developer Schritte:

1. Apple Developer Account öffnen.
2. `Certificates, Identifiers & Profiles` öffnen.
3. Unter `Identifiers` eine `Pass Type ID` erstellen oder die vorhandene öffnen.
4. Der Identifier ist deine `APPLE_PASS_TYPE_ID`, zum Beispiel `pass.com.deinefirma.loyalty`.
5. Unter `Certificates` ein `Pass Type ID Certificate` für diese Pass Type ID erstellen.
6. Dafür die Certificate Signing Request Datei aus dem Schlüsselbund hochladen.
7. Die heruntergeladene `.cer` Datei lokal in PEM umwandeln und als `certs/pass-cert.pem` speichern.
8. Den passenden privaten Schlüssel aus dem Schlüsselbund exportieren bzw. als `certs/pass-key.pem` bereitstellen.

Hinweis:

- Eine Datei mit Endung `.certSigningRequest` ist nur die Anfrage an Apple, nicht der private Key und nicht das fertige Zertifikat.
- Eine `.p12` Datei kann Zertifikat und privaten Schlüssel enthalten, muss aber in `pass-cert.pem` und `pass-key.pem` umgewandelt werden, bevor die Edge Functions sie als Secrets verwenden.

## 3. Apple APNs Key für Wallet Updates

Diese Werte sind für Push-Updates an bereits installierte Apple-Wallet-Karten notwendig:

- `APPLE_APNS_KEY_ID`
- `APPLE_APNS_TEAM_ID`
- `APPLE_APNS_AUTH_KEY`

Apple Developer Schritte:

1. Apple Developer Account öffnen.
2. `Certificates, Identifiers & Profiles` öffnen.
3. Links `Keys` öffnen.
4. Neue Key-Datei erstellen.
5. `Apple Push Notification service` aktivieren.
6. Key-Konfiguration bestätigen.
7. Key herunterladen. Apple liefert eine Datei wie `AuthKey_XXXXXXXXXX.p8`.
8. Die Datei in `certs/` ablegen, zum Beispiel `certs/AuthKey_XXXXXXXXXX.p8`.
9. Die 10-stellige Zeichenfolge im Dateinamen bzw. in den Key-Details ist die `APPLE_APNS_KEY_ID`.
10. Deine Apple Team ID ist `APPLE_APNS_TEAM_ID`; sie ist im Apple Developer Account bei Membership/Team sichtbar und entspricht meistens `APPLE_TEAM_ID`.

Wichtig:

- Apple erlaubt den Download einer `.p8` Key-Datei normalerweise nur einmal. Danach sicher sichern.
- Für dieses Projekt muss der Inhalt der `.p8` Datei serverseitig als Secret `APPLE_APNS_AUTH_KEY` gesetzt werden.
- Apple Wallet Pass Updates verwenden als APNs Topic die Pass Type ID, also `APPLE_PASS_TYPE_ID`.

## 4. Google Wallet Issuer ID

Dieser Wert ist für alle Google Wallet Classes, Objects und Save Links notwendig:

- `GOOGLE_WALLET_ISSUER_ID`

Google Schritte:

1. Google Pay & Wallet Console öffnen.
2. Mit dem Google Account anmelden, der Admin für den Issuer sein soll.
3. Google Wallet API Issuer Account erstellen.
4. Google Wallet API Dashboard öffnen.
5. Die Issuer ID aus der Console kopieren.
6. Neue Issuer starten im Demo-Modus. Für echte Kunden ausserhalb von Admin/Developer/Test-Accounts muss später Publishing Access freigeschaltet werden.

## 5. Google Service Account JSON

Dieser Wert ist für serverseitige Google Wallet REST API Calls notwendig:

- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`

Google Cloud Schritte:

1. Google Cloud Console öffnen.
2. Das Cloud-Projekt für Wallet auswählen oder erstellen.
3. Google Wallet API aktivieren.
4. Einen Service Account erstellen.
5. Die Service-Account-E-Mail notieren.
6. Für den Service Account einen JSON Key erzeugen und herunterladen.
7. Die JSON-Datei lokal als `google-service-account.json` im Projektroot oder als `certs/google-service-account.json` ablegen.
8. In der Google Pay & Wallet Console unter `Users` die Service-Account-E-Mail als User mit Rolle `Developer` einladen.

Wichtig:

- Das JSON ist ein hochsensibles Secret.
- Nicht in `public/` legen.
- Nicht commiten.
- Nicht in README, Screenshots oder Browser-Konsole ausgeben.

## 6. Secrets lokal vorbereiten

Nachdem die Apple `.p8` Datei und die Google JSON Datei lokal liegen:

```bash
node scripts/prepare-supabase-secrets-local.js --write --force
node scripts/wallet-credential-files-check.js --strict
```

Wenn das Prep-Script eine Datei nicht automatisch findet, die Werte manuell in `supabase/secrets.local.env` setzen:

```bash
APPLE_APNS_KEY_ID="DEINE_10_ZEICHEN_KEY_ID"
APPLE_APNS_TEAM_ID="DEINE_APPLE_TEAM_ID"
APPLE_APNS_AUTH_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
GOOGLE_WALLET_ISSUER_ID="DEINE_NUMERISCHE_ISSUER_ID"
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

Danach erneut prüfen:

```bash
node scripts/wallet-credential-files-check.js --strict
node scripts/wallet-go-live-report.js --skip-remote
```

## 7. Supabase Secrets setzen

Wenn `supabase/secrets.local.env` vollständig ist:

```bash
bash scripts/set-supabase-secrets.sh --dry-run
bash scripts/set-supabase-secrets.sh
```

Das Script nutzt bei fehlendem globalem `supabase` automatisch `pnpm dlx supabase` oder `npx --yes supabase`, leitet die Project Ref aus `config.json -> supabase.url` ab und gibt keine Secret-Werte aus. Für echte Writes vorher `supabase login` ausführen oder `SUPABASE_ACCESS_TOKEN` setzen.

Alternativ einzelne Werte setzen:

```bash
supabase secrets set APPLE_APNS_KEY_ID="DEINE_10_ZEICHEN_KEY_ID"
supabase secrets set APPLE_APNS_TEAM_ID="DEINE_APPLE_TEAM_ID"
supabase secrets set APPLE_APNS_AUTH_KEY="$(cat certs/AuthKey_XXXXXXXXXX.p8)"
supabase secrets set GOOGLE_WALLET_ISSUER_ID="DEINE_NUMERISCHE_ISSUER_ID"
supabase secrets set GOOGLE_WALLET_SERVICE_ACCOUNT_JSON="$(cat google-service-account.json)"
```

## 8. Danach remote prüfen

Nach Supabase SQL, Secrets und Function Deploy:

```bash
node scripts/wallet-remote-schema-check.js --strict
node scripts/wallet-smoke-test.js --functions --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --strict
node scripts/wallet-go-live-report.js
```

Nach echten Apple-/Google-Aktionen:

```bash
node scripts/wallet-acceptance-audit.js --strict
```

## 9. Go-Live-Reihenfolge

1. Apple Pass Type ID, Pass-Zertifikat, WWDR und Private Key fertigstellen.
2. Apple APNs `.p8` Key erstellen und `APPLE_APNS_KEY_ID`/`APPLE_APNS_AUTH_KEY` setzen.
3. Google Wallet Issuer erstellen und `GOOGLE_WALLET_ISSUER_ID` setzen.
4. Google Cloud Service Account JSON erzeugen, in Google Wallet Console als Developer berechtigen und `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` setzen.
5. `supabase/schema.sql` oder SQL-Editor-Chunks ausführen.
6. Supabase Secrets setzen.
7. Edge Functions deployen.
8. Lokale und Remote Checks ausführen.
9. Apple Karte auf iPhone installieren und Device Registration prüfen.
10. Google Save Link speichern und `google_wallet_objects` prüfen.
11. Wallet Nachricht senden und Logs in `wallet_push_logs`/`wallet_notification_recipients` prüfen.
