# Samsung Wallet Integration Report

Status: Samsung Backend ist live vorbereitet, die Claim-Seite ist angebunden und Device Routing ist geprüft.

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
- `scripts/wallet-remote-schema-check.js`
- `scripts/verify-wallet-remote-schema-check.js`
- `public/js/walletDeviceDetection.js`
- `scripts/verify-wallet-device-detection.js`
- `public/claim.html`
- `public/js/claim.js`
- `scripts/verify-claim-page-output-safety.js`
- `docs/WALLET_EXTERNAL_ACCEPTANCE.md`
- `docs/WALLET_INTEGRATION_CONTEXT.md`
- `docs/SAMSUNG_CLAIM_UI_CHANGE_REQUEST.md`
- `SAMSUNG_MISSING_DATA.md`

## 2. Neue Dateien

- `supabase/functions/_shared/samsungWalletProvider.ts`
- `supabase/functions/samsung-wallet-add-link/index.ts`
- `supabase/functions/samsung-wallet-server/index.ts`
- `supabase/functions/update-samsung-wallet-pass/index.ts`
- `scripts/verify-samsung-wallet-contract.js`
- `scripts/samsung-wallet-smoke-test.js`
- `scripts/verify-samsung-wallet-smoke-test.js`
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
- `update-samsung-wallet-pass`

## 6. Sicherheitsprüfung

- Samsung-Links enthalten nur `refId`.
- Private Keys und Partner Secrets bleiben serverseitig in Supabase Secrets.
- `samsung-wallet-add-link` nutzt das bestehende Public-Rate-Limit.
- `samsung-wallet-server` prüft Samsung Bearer-JWS gegen `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM`.
- `update-samsung-wallet-pass` ist betreiber-geschützt, verlangt Login plus `unlock=true` und schreibt redigierte Audit-Events.
- `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` ist nur Sandbox-Debug und darf nicht produktiv aktiv sein.

## 7. Mögliche Risiken

- Samsung Public Key/Zertifikat wurde aus `X303/el_promillo_walletsvc.samsung.com.crt` lokal vorbereitet.
- Der passende alte Samsung Private Key wurde unter `/Users/fabricio/samsung-wallet-keys/samsung_wallet_private.key` gefunden und lokal in den ignorierten Projektordner kopiert.
- Key, CSR und Partner-Zertifikat passen jetzt zusammen.
- Samsung bleibt ein eigener Data-Fetch-Flow über `samsung_wallet_instances`; die bestehenden Apple-/Google-`wallet_platform` Constraints werden nicht auf Samsung umgestellt.
- Die exakte Samsung-Kartenfeld-Spezifikation muss im Samsung Test Tool validiert werden.

## 8. Teststatus

Lokal geprüft:

- `pnpm check`
- `scripts/verify-samsung-wallet-contract.js`
- `scripts/verify-prepare-supabase-secrets-local.js`
- `scripts/samsung-wallet-smoke-test.js --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1 --strict`
- `scripts/verify-wallet-device-detection.js`
- `scripts/verify-claim-page-output-safety.js`
- Edge TypeScript-Syntax
- Edge Function Imports
- Edge JWT Policy
- Supabase Schema Sanity
- Remote Edge Function CORS/Availability
- Remote Samsung Tabellen `samsung_wallet_instances` und `samsung_wallet_events`

Lokale Samsung-Secret-Vorbereitung findet 15 Samsung-Werte. Es fehlen keine Samsung-Werte mehr.

Der Samsung-Smoke-Test erzeugte erfolgreich einen Data-Fetch-Link mit `pdata`, speicherte eine `samsung_wallet_instances`-Zeile, loggte `add_link_created` und bestätigte, dass `samsung-wallet-server` ohne Samsung Bearer-JWS mit `401 SAMSUNG_AUTHORIZATION_REQUIRED` blockiert.

Die Device Detection ist in `public/js/claim.js` eingebunden. iPhone/iPad priorisiert Apple Wallet, Samsung Android priorisiert Samsung Wallet, andere Android-Geräte priorisieren Google Wallet; alle Buttons bleiben manuell verfügbar.

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
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server,update-samsung-wallet-pass
```

5. In Samsung Partner Portal setzen:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server
```

## 10. Rollback Strategie

- Edge Functions `samsung-wallet-add-link`, `samsung-wallet-server` und `update-samsung-wallet-pass` nicht mehr deployen oder deaktivieren.
- Samsung Secrets aus Supabase entfernen.
- Samsung Partner Server URL im Samsung Portal deaktivieren.
- Da alle SQL-Änderungen additiv sind, bleiben Apple und Google weiter nutzbar.
