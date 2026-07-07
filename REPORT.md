# Samsung Wallet Integration Report

Status: Backend vorbereitet, Live-Aktivierung noch nicht abgeschlossen.

## 1. Geänderte Dateien

- `README.md`
- `package.json`
- `supabase/schema.sql`
- `supabase/config.toml`
- `supabase/secrets.example.env`
- `scripts/deploy-wallet-functions.sh`
- `scripts/wallet-edge-functions-report.js`
- `scripts/wallet-smoke-test.js`
- `scripts/verify-supabase-edge-jwt-policy.js`
- `scripts/verify-supabase-secrets-template.js`
- `scripts/verify-wallet-architecture-contract.js`
- `scripts/verify-wallet-deploy-checklist.js`
- `scripts/verify-wallet-deploy-script.js`
- `scripts/verify-wallet-edge-functions-report.js`
- `scripts/prepare-supabase-secrets-local.js`
- `scripts/verify-prepare-supabase-secrets-local.js`
- `docs/WALLET_EXTERNAL_ACCEPTANCE.md`
- `docs/WALLET_INTEGRATION_CONTEXT.md`
- `SAMSUNG_MISSING_DATA.md`

## 2. Neue Dateien

- `supabase/functions/_shared/samsungWalletProvider.ts`
- `supabase/functions/samsung-wallet-add-link/index.ts`
- `supabase/functions/samsung-wallet-server/index.ts`
- `scripts/verify-samsung-wallet-contract.js`
- `docs/samsung-wallet.md`
- `docs/provider-architecture.md`
- `docs/wallet.md`
- `docs/setup.md`
- `REPORT.md`

## 3. Datenbankänderungen

Additiv in `supabase/schema.sql`:

- `samsung_wallet_instances`
- `samsung_wallet_events`
- Indexe für Owner, Business, Template, Card ID, Ref ID und Events
- RLS für Betreiber-Lesezugriff
- keine Änderung an bestehenden Apple-/Google-Tabellen
- keine Änderung an bestehenden `wallet_platform` Constraints

## 4. Neue ENV Variablen

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

## 5. Neue Edge Functions

- `samsung-wallet-add-link`
- `samsung-wallet-server`

## 6. Sicherheitsprüfung

- Samsung-Links enthalten nur `refId`.
- Private Keys und Partner Secrets bleiben serverseitig in Supabase Secrets.
- `samsung-wallet-add-link` nutzt das bestehende Public-Rate-Limit.
- `samsung-wallet-server` prüft Samsung Bearer-JWS gegen `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM`.
- `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` ist nur Sandbox-Debug und darf nicht produktiv aktiv sein.

## 7. Mögliche Risiken

- Samsung Public Key/Zertifikat wurde aus `X303/el_promillo_walletsvc.samsung.com.crt` lokal vorbereitet.
- Der passende alte Samsung Private Key wurde unter `/Users/fabricio/samsung-wallet-keys/samsung_wallet_private.key` gefunden und lokal in den ignorierten Projektordner kopiert.
- Key, CSR und Partner-Zertifikat passen jetzt zusammen.
- Die bestehende Claim-UI ist noch nicht auf automatische Samsung-Geräteauswahl erweitert, weil das Apple-/Google-Claim-Flows berührt und nach Regel 3 separat bestätigt werden muss.
- Die exakte Samsung-Kartenfeld-Spezifikation muss im Samsung Test Tool validiert werden.

## 8. Teststatus

Lokal geprüft:

- `pnpm check`
- `scripts/verify-samsung-wallet-contract.js`
- `scripts/verify-prepare-supabase-secrets-local.js`
- Edge TypeScript-Syntax
- Edge Function Imports
- Edge JWT Policy
- Supabase Schema Sanity

Lokale Samsung-Secret-Vorbereitung findet 15 Samsung-Werte. Es fehlen keine Samsung-Werte mehr.

Hinweis: Die lokale Codex-Runtime nutzt Node 24; das Projekt erwartet Node 20. Der Check läuft trotzdem durch.

## 9. Deployment Hinweise

1. `supabase/schema.sql` vollständig ausführen.
2. `supabase/secrets.local.env` mit Samsung-Werten füllen.
3. Secrets setzen:

```bash
bash scripts/set-supabase-secrets.sh
```

4. Samsung Functions deployen:

```bash
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server
```

5. In Samsung Partner Portal setzen:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server
```

## 10. Rollback Strategie

- Edge Functions `samsung-wallet-add-link` und `samsung-wallet-server` nicht mehr deployen oder deaktivieren.
- Samsung Secrets aus Supabase entfernen.
- Samsung Partner Server URL im Samsung Portal deaktivieren.
- Da alle SQL-Änderungen additiv sind, bleiben Apple und Google weiter nutzbar.
