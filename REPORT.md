# Samsung Wallet Integration Report

Status: Samsung Backend ist live vorbereitet, die Claim-Seite ist angebunden und Device Routing ist geprüft.

## 1. Geänderte Dateien

- `.gitignore`
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
- `public/js/dashboard.js`
- `public/js/editor.js`
- `server/index.js`
- `supabase/functions/get-public-template/index.ts`
- `supabase/functions/claim-card/index.ts`
- `supabase/functions/generate-card-pdf/index.ts`
- `supabase/functions/_shared/samsungWalletProvider.ts`
- `scripts/verify-claim-page-output-safety.js`
- `docs/WALLET_EXTERNAL_ACCEPTANCE.md`
- `docs/WALLET_INTEGRATION_CONTEXT.md`
- `docs/SAMSUNG_CLAIM_UI_CHANGE_REQUEST.md`
- `SAMSUNG_MISSING_DATA.md`

## 2. Neue Dateien

- `supabase/functions/_shared/samsungWalletProvider.ts`
- `supabase/functions/_shared/walletProviderRegistry.ts`
- `supabase/functions/samsung-wallet-add-link/index.ts`
- `supabase/functions/samsung-wallet-server/index.ts`
- `supabase/functions/update-samsung-wallet-pass/index.ts`
- `scripts/verify-samsung-wallet-contract.js`
- `scripts/samsung-wallet-smoke-test.js`
- `scripts/verify-samsung-wallet-smoke-test.js`
- `scripts/verify-samsung-wallet-error-paths.js`
- `scripts/samsung-wallet-partner-callback-test.js`
- `scripts/verify-samsung-wallet-partner-callback-test.js`
- `scripts/samsung-wallet-callback-evidence.js`
- `scripts/verify-samsung-wallet-callback-evidence.js`
- `scripts/samsung-wallet-final-readiness.js`
- `scripts/verify-samsung-wallet-final-readiness.js`
- `scripts/verify-samsung-wallet-goal-audit.js`
- `scripts/verify-claim-token-links.js`
- `docs/SAMSUNG_BEARER_TEST_GUIDE.md`
- `docs/SAMSUNG_WALLET_GOAL_AUDIT.md`
- `docs/samsung-wallet.md`
- `docs/SAMSUNG_BEARER_TEST_GUIDE.md`
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
- gemeinsame Provider-Registry mit internem `walletCardModel`
- `card_templates.public_claim_token` für neue tokenisierte Claim-/QR-Links; bestehende Template-ID-Links bleiben als Fallback gültig

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
- Neue QR-/Claim-Links enthalten `public_claim_token` statt interner Template-ID; öffentliche Template-Responses geben den Token nicht zurück.
- Private Keys und Partner Secrets bleiben serverseitig in Supabase Secrets.
- `samsung-wallet-add-link` nutzt das bestehende Public-Rate-Limit.
- `samsung-wallet-server` prüft Samsung Bearer-JWS gegen `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM`.
- `samsung-wallet-server` akzeptiert Status-Callbacks robust als Query, JSON-Body oder Form-Body und schreibt nur redigierte Auditfelder.
- `update-samsung-wallet-pass` ist betreiber-geschützt, verlangt Login plus `unlock=true` und schreibt redigierte Audit-Events.
- `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` ist nur Sandbox-Debug und darf nicht produktiv aktiv sein.
- Der Unverified-Fallback ist im Code deaktiviert, sobald `SAMSUNG_WALLET_ENV=production`, `prod` oder `live` ist.

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
- `scripts/verify-claim-token-links.js`
- `scripts/verify-samsung-wallet-error-paths.js`
- `scripts/verify-samsung-wallet-partner-callback-test.js`
- `scripts/verify-samsung-wallet-callback-evidence.js`
- `scripts/samsung-wallet-callback-evidence.js`
- `scripts/samsung-wallet-final-readiness.js --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1`
- `scripts/samsung-wallet-production-gate.js --env-file supabase/secrets.local.env --authorization-file tmp/samsung-bearer.txt --strict`
- `scripts/verify-samsung-wallet-goal-audit.js`
- Edge TypeScript-Syntax
- Edge Function Imports
- Edge JWT Policy
- Supabase Schema Sanity
- Remote Edge Function CORS/Availability
- Remote Samsung Tabellen `samsung_wallet_instances` und `samsung_wallet_events`

Lokale Samsung-Secret-Vorbereitung findet 15 Samsung-Werte. Es fehlen keine Samsung-Werte mehr.

Der Samsung-Smoke-Test erzeugte erfolgreich einen Data-Fetch-Link mit `pdata`, speicherte eine `samsung_wallet_instances`-Zeile, loggte `add_link_created` und bestätigt je nach Remote-Modus entweder, dass `samsung-wallet-server` ohne Samsung Bearer-JWS mit `401 SAMSUNG_AUTHORIZATION_REQUIRED` blockiert, oder dass der bewusst aktivierte Sandbox-Fallback greift.

Die Device Detection ist in `public/js/claim.js` eingebunden. Der Hauptbutton `Zu Wallet hinzufügen` öffnet je nach Gerät Apple, Samsung oder Google Wallet; Apple-, Google- und Samsung-Buttons bleiben zusätzlich manuell verfügbar. Neue QR-Codes und QR-PDFs öffnen `/claim.html?token=<public_claim_token>`; alte `/claim.html?template=<template_id>` Links bleiben weiterhin gültig.

Die Samsung-Erkennung wurde zusätzlich zwischen Browser-Device-Detection und Provider-Registry abgeglichen: Samsung-Hinweise wie `samsung`, `sm-`, `samsungbrowser` und `galaxy` routen zu Samsung Wallet, damit Galaxy-Geräte mit Chrome nicht versehentlich in den Google-Wallet-Pfad fallen. Die drei Samsung Edge Functions wurden danach erneut deployed und remote per Edge-Functions-Report plus Samsung-Smoke-Test geprüft.

Für die letzte externe Samsung-Partner-Callback-Abnahme ist `scripts/samsung-wallet-partner-callback-test.js` vorbereitet. Es ruft `GET /cards/{cardId}/{refId}` und optional `POST /cards/{cardId}/{refId}` gegen `samsung-wallet-server` mit einem frischen Samsung-Test-Tool-Bearer auf und prüft danach `get_card_data`, `send_card_state` und den Kartenstatus, ohne Authorization Header, Secrets oder vollständige Add-to-Wallet-URLs auszugeben.

`scripts/samsung-wallet-callback-evidence.js` zeigt nach einem Handy- oder Test-Tool-Versuch redigiert, ob `add_link_created`, `get_card_data`, `send_card_state` oder `authorization_failed` Events in Supabase angekommen sind. Zusätzlich wertet es `auth_status` aus: `verified` ist produktionsreife Bearer-Evidence, `unverified_missing_authorization` oder fehlender Status bleibt Sandbox-/Alt-Event-Evidence. Dadurch kann ein echter Samsung-Rückruf von einem reinen Frontend-/QR-Test unterschieden werden, ohne Bearer oder Secrets zu drucken. Die aktualisierte `samsung-wallet-server` Function wurde erneut deployed; ein frischer Remote-Smoke-Test schreibt nun `auth_status=unverified_missing_authorization`, `auth_verified=false` und `auth_warning_code=SAMSUNG_AUTHORIZATION_UNVERIFIED_MISSING` in die GET-/POST-Events.

`scripts/samsung-wallet-final-readiness.js` fasst die lokale und remote Samsung-Abnahme zusammen: statische Provider-/Device-/Token-Checks, Remote-Schema, Edge-Function-Preflight, Samsung-Smoke-Test und optional den echten Partner-Callback, sobald `tmp/samsung-bearer.txt` oder getrennte GET/POST-Bearer-Dateien vorhanden sind. Ohne Bearer meldet der Check bewusst `EXTERNAL_BLOCKED`.

`scripts/samsung-wallet-production-gate.js` ist der zusätzliche Go-Live-Blocker: Er prüft lokale Samsung-Produktions-Secrets, verlangt `SAMSUNG_WALLET_ENV=production`, `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false`, HTTPS-URLs, einen echten Samsung Callback-Bearer und `Samsung Verified Callback Evidence: OK` aus Supabase Events. Ein lokaler Bearer-Dateiname ohne verifiziertes Callback-Event reicht nicht. Das Gate redigiert Secrets, Zertifikate, Bearer und vollständige URLs.

`docs/SAMSUNG_WALLET_GOAL_AUDIT.md` dokumentiert den Samsung-Zielprompt requirementweise gegen den aktuellen Repo-Stand. `scripts/verify-samsung-wallet-goal-audit.js` prüft, dass dieser Audit, Provider-Architektur, Device Routing, Samsung SQL, Report und Production-Blocker weiter zusammenpassen.

`samsung-wallet-server` schreibt zusätzlich ein redigiertes `authorization_failed` Event, falls Samsung eine bekannte `refId` aufruft, der Bearer aber nicht validiert werden kann. Dadurch bleiben echte Samsung-Callback-Versuche sichtbar, ohne Authorization Header oder sensible Daten zu speichern.

Der Samsung-Handy-Test vom 8. Juli 2026 zeigte erstmals einen echten Rückruf bis zur Edge Function, aber ohne `Authorization: Bearer <JWS>` Header. Für genau diesen Samsung-Sandbox-Fall akzeptiert `samsung-wallet-server` fehlende Authorization nur, wenn `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` gesetzt ist und `SAMSUNG_WALLET_ENV` nicht `production`, `prod` oder `live` ist. Danach wurden remote `get_card_data` Events durch echte Handy-Tests bestätigt. Der Remote-Smoke-Test prüft zusätzlich einen `POST Card State` im Sandbox-Fallback und bestätigt `send_card_state`, `last_event=ADDED` und `card_status=active`. Produktiv muss dieser Wert wieder `false` sein oder Samsung muss den signierten Bearer wie erwartet senden.

Der Bearer-Test wurde zusätzlich gegen einen bewusst ungültigen Header ausgeführt. Ergebnis: Das Script läuft sauber bis zur Remote-Samsung-Auth-Prüfung und erhält erwartungsgemäss `401 SAMSUNG_AUTHORIZATION_REQUIRED`; es scheitert nicht mehr lokal am Testscript. `docs/SAMSUNG_BEARER_TEST_GUIDE.md` dokumentiert den späteren Ablauf, sobald der echte Samsung-Bearer vorhanden ist. `.gitignore` schützt lokale `*bearer*.txt*` Dateien vor versehentlichem Commit.

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

---

# Render Backend-Only Migration Report

Datum: 2026-07-07

## Geänderte Dateien

- `server/index.js`
- `render.yaml`
- `.env.example`
- `config.example.json`
- `public/config.public.json`
- `docs/RENDER_DEPLOYMENT.md`
- `REPORT.md`

## Neue Dateien

- `ARCHITECTURE_REPORT.md`
- `FRONTEND_IMPACT.md`
- `RENDER_BACKEND_MIGRATION.md`

## Backend Änderungen

- `server/index.js` kennt jetzt `SERVE_STATIC_FRONTEND`.
- Wenn `SERVE_STATIC_FRONTEND=false` gesetzt ist, liefert der Server keine statischen Dateien aus `public/` und keinen `index.html`-Fallback mehr.
- Bekannte Backend-Routen wie `/api/config`, `/api/health`, `/api/qrcode`, `/api/templates/:templateId`, `/api/cards/claim` und `/api/scanner/actions` bleiben aktiv.
- Unbekannte Render-Frontend-Routen antworten mit `404 FRONTEND_NOT_HOSTED_ON_RENDER`.

## Deployment Änderungen

- `render.yaml` setzt `SERVE_STATIC_FRONTEND=false`.
- `APP_PUBLIC_BASE_URL` zeigt auf GitHub Pages.
- `APP_API_BASE_URL` zeigt auf das aktive Render-Backend `https://el-promillo-j1n0.onrender.com`.
- `CORS_ORIGIN` erlaubt die GitHub-Pages-Origin.

## Frontend Bestätigung

Frontend-Code, UI, CSS, Routing und Build-Struktur wurden NICHT verändert.

Die einzige Frontend-nahe Änderung ist `public/config.public.json`: Dort wurde ausschliesslich die öffentliche Backend-URL von der alten Render-URL auf das aktive Render-Backend geändert. Details stehen in `FRONTEND_IMPACT.md`.

## Render Bestätigung

Render hostet ausschliesslich das Backend, sobald der Blueprint deployed ist.

## Funktionsbestätigung

Keine bestehende Frontend-Funktion wurde absichtlich verändert. Die bestehende GitHub-Pages-App nutzt weiterhin ihre bisherige Struktur und ruft das Render-Backend über `app.apiBaseUrl` auf.

## Rollback Plan

1. In Render `SERVE_STATIC_FRONTEND=true` setzen oder die Env-Variable entfernen.
2. Alternativ den letzten Commit der Backend-only-Migration revertieren.
3. Render neu deployen.
4. Optional `public/config.public.json` wieder auf die vorherige Backend-URL setzen, falls ein anderer Backend-Service aktiviert wird.
