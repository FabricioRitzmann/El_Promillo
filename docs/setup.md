# Setup

Diese Datei fasst den lokalen und produktiven Setup-Pfad für El Promillo zusammen. Detaildokumente:

- `README.md`
- `docs/WALLET_INTEGRATION_CONTEXT.md`
- `docs/WALLET_EXTERNAL_ACCEPTANCE.md`
- `docs/samsung-wallet.md`

## Lokal starten

```bash
npm install
cp config.example.json config.json
npm start
```

Falls `npm` lokal nicht im PATH ist:

```bash
bash scripts/start-local.sh
```

## Supabase SQL

`supabase/schema.sql` vollständig im Supabase SQL Editor ausführen. Danach optional:

```sql
notify pgrst, 'reload schema';
```

Für grosse SQL-Editor-Eingaben:

```bash
node scripts/prepare-supabase-sql-editor-bundle.js --write
node scripts/prepare-supabase-sql-editor-chunks.js --write --force
```

## Supabase Secrets

Vorlage kopieren:

```bash
cp supabase/secrets.example.env supabase/secrets.local.env
```

Echte Werte nur in `supabase/secrets.local.env` eintragen. Diese Datei ist ignoriert und darf nicht committet werden.

Secrets setzen:

```bash
bash scripts/set-supabase-secrets.sh --dry-run
bash scripts/set-supabase-secrets.sh
```

## Edge Functions deployen

Alle Wallet Functions:

```bash
bash scripts/deploy-wallet-functions.sh --dry-run
bash scripts/deploy-wallet-functions.sh
```

Nur Samsung:

```bash
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server,update-samsung-wallet-pass
```

## Samsung Wallet

Samsung benötigt zusätzlich:

- `SAMSUNG_WALLET_PRIVATE_KEY_PEM`
- `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM`
- `SAMSUNG_WALLET_PARTNER_SERVER_URL`
- `SAMSUNG_WALLET_RD_CLICK_URL`
- `SAMSUNG_WALLET_RD_IMPRESSION_URL`

Produktionswichtig: `SAMSUNG_WALLET_ENV=production` und `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false`. Der Code deaktiviert den unverified Samsung-Fallback zusätzlich automatisch, wenn `SAMSUNG_WALLET_ENV=production`, `prod` oder `live` gesetzt ist.

Die Partner Server URL in Samsung muss auf die deployte Function zeigen:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server
```

## Checks

```bash
npm run check
node scripts/verify-samsung-wallet-contract.js
node scripts/wallet-edge-functions-report.js --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --strict
```

## Bekannte sichere Grenze

Samsung bleibt additiv: Die Claim-Seite priorisiert Samsung nur auf erkannten Samsung-Android-Geräten, Apple/Google bleiben manuell verfügbar und die bestehenden Apple-/Google-Datenmodelle werden nicht umgestellt.

Neue QR-Codes und QR-PDFs verwenden `card_templates.public_claim_token` in `/claim.html?token=...`. Alte `/claim.html?template=...` Links bleiben gültig, damit bereits gedruckte oder geteilte QR-Codes nicht kaputtgehen.
