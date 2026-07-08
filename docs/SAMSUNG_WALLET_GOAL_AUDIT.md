# Samsung Wallet Goal Audit

Stand: 2026-07-08

Diese Datei prüft den aktiven Samsung-Wallet-Zielprompt gegen den aktuellen
Repo-Stand. Sie ersetzt nicht die externe Samsung-Produktionsabnahme, hält aber
fest, welche Anforderungen im Code nachweisbar umgesetzt sind und welcher
Punkt nur durch Samsung selbst belegt werden kann.

## Kurzstatus

Repo-seitig umgesetzt und geprüft:

- Samsung Wallet ist als zusätzlicher Provider neben Apple und Google ergänzt.
- Apple- und Google-Pfade bleiben getrennt und unverändert erreichbar.
- Die öffentliche Claim-Seite routet iPhone/iPad zu Apple, Samsung Android zu Samsung, andere Android-Geräte zu Google und unsichere Geräte zur manuellen Auswahl.
- Samsung nutzt den Data-Fetch-Link-Flow mit `pdata={refId}`.
- QR-/Claim-Links enthalten keine Samsung-Secrets und keine vollständigen Kartendaten.
- Alle Samsung-Aktionen laufen über Supabase Edge Functions.
- Samsung-Secrets bleiben serverseitig in Supabase Secrets.
- Samsung GET Card Data, POST Card State, Update Notification und Cancel Notification sind vorbereitet.
- Remote-Smoke-Test bestätigt Add-Link, Data Fetch, `get_card_data` und im Sandbox-Fallback `send_card_state`.

Noch extern zu beweisen:

- Ein echter Samsung-Produktionscallback mit gültigem `Authorization: Bearer <JWS>`.
- Das Samsung Production Gate muss mit `SAMSUNG_WALLET_ENV=production`, `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false`, echtem Bearer und `Samsung Verified Callback Evidence: OK` grün laufen.

## Requirement Audit

| Prompt-Anforderung | Status | Evidenz |
| --- | --- | --- |
| Projektanalyse vor Änderung | umgesetzt | `docs/WALLET_IMPLEMENTATION_PLAN.md`, `docs/provider-architecture.md`, `REPORT.md` |
| Bestehenden Apple-/Google-Code nicht ersetzen | umgesetzt | Samsung liegt additiv in `samsung-wallet-*` Functions und `samsungWalletProvider.ts`; Apple/Google Contract-Checks laufen weiter |
| Provider-Architektur Apple/Google/Samsung | umgesetzt | `supabase/functions/_shared/walletProviderRegistry.ts`, `scripts/verify-wallet-architecture-contract.js` |
| Provider-Methoden `create`, `update`, `delete`, `revoke`, `generateAddLink`, `generateQRCode`, `detectSupport`, `serialize`, `deserialize`, `mapping` | umgesetzt | `scripts/verify-samsung-wallet-contract.js`, `scripts/verify-wallet-architecture-contract.js` |
| Gemeinsames internes CardModel | umgesetzt | `walletCardModel()` in `supabase/functions/_shared/walletProviderRegistry.ts` |
| Business, Customer, Card, Template, Branding, Codes, Loyalty, Notifications, Geo Locations, Dynamic Fields, Custom Fields | umgesetzt | `walletCardModel()` und Architektur-Verifier |
| Robuste Device Detection | umgesetzt | `public/js/walletDeviceDetection.js`, `scripts/verify-wallet-device-detection.js` |
| Hauptbutton wählt passenden Provider | umgesetzt | `public/js/claim.js`, `scripts/verify-claim-page-output-safety.js` |
| Manuelle Apple-/Google-/Samsung-Buttons | umgesetzt | `public/claim.html`, `public/js/claim.js` |
| Samsung Data Fetch Link | umgesetzt | `supabase/functions/_shared/samsungWalletProvider.ts`, `samsung-wallet-add-link` |
| GET Card Data | umgesetzt | `supabase/functions/samsung-wallet-server/index.ts` |
| POST Card State | umgesetzt | `supabase/functions/samsung-wallet-server/index.ts` |
| Update Notification | umgesetzt | `supabase/functions/update-samsung-wallet-pass/index.ts`, `samsungWalletProvider.update()` |
| Cancel Notification | umgesetzt | `supabase/functions/update-samsung-wallet-pass/index.ts`, `samsungWalletProvider.revoke()` |
| Samsung Authorization / Bearer Token | repo-seitig umgesetzt, extern offen | `verifyPartnerServerAuthorization()`, `docs/SAMSUNG_BEARER_TEST_GUIDE.md`, `scripts/samsung-wallet-partner-callback-test.js` |
| Keine Secrets im Frontend | umgesetzt | `scripts/verify-browser-secret-boundary.js`, `scripts/verify-edge-secret-boundary.js` |
| Wallet-Aktionen über Edge Functions | umgesetzt | `supabase/functions/samsung-wallet-add-link`, `samsung-wallet-server`, `update-samsung-wallet-pass` |
| QR enthält keine sensiblen Daten | umgesetzt | `public_claim_token` im Claim-Link, `refId` im Samsung-Link, `scripts/verify-claim-token-links.js` |
| Datenbanktabellen für Samsung | umgesetzt | `samsung_wallet_instances`, `samsung_wallet_events` in `supabase/schema.sql` |
| RLS und Betreiber-Isolation | umgesetzt | RLS Policies und Grants in `supabase/schema.sql` |
| Rate Limiting | umgesetzt | `public_edge_rate_limits`, `enforcePublicClaimRateLimit()` in `samsung-wallet-add-link` |
| Input-/Output-Validation | umgesetzt | strukturierte Fehlerpfade und `publicResponses`/Redaction-Verifier |
| Error Handling | umgesetzt | `scripts/verify-samsung-wallet-error-paths.js` |
| Retry-/Update-Struktur | umgesetzt | Samsung Update Function, Wallet Update Queue bleibt für bestehende Provider erhalten |
| Tests für Apple, Google, Samsung, Device Detection, QR, Routing, Unauthorized, Missing ENV/Card/Partner | umgesetzt | `pnpm check`, Samsung Smoke/Readiness/Error-Path-Verifier |
| Doku `docs/wallet.md`, `docs/samsung-wallet.md`, `docs/provider-architecture.md`, `docs/setup.md` | umgesetzt | alle vier Dateien vorhanden und im Check referenziert |
| `REPORT.md` mit Dateien, DB, ENV, Edge Functions, Security, Risiken, Tests, Deployment, Rollback | umgesetzt | `REPORT.md` |

## Verifikation

Lokal:

```bash
pnpm check
```

Remote:

```bash
node scripts/samsung-wallet-final-readiness.js \
  --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1
```

Callback-Spur nach Handy-/Test-Tool-Versuch:

```bash
node scripts/samsung-wallet-callback-evidence.js
```

Für den Livegang muss dort `Verified Auth Evidence` auf `OK` stehen. Reine
Sandbox-Fallbacks oder alte Events ohne `auth_status` zählen nicht als
Produktionsnachweis.

Produktions-Gate:

```bash
node scripts/samsung-wallet-production-gate.js \
  --env-file supabase/secrets.local.env \
  --authorization-file tmp/samsung-bearer.txt \
  --strict
```

## Aktueller Blocker

Der verbleibende Blocker ist kein lokaler Codepunkt: Samsung muss im echten
Partner-Server-Callback einen gültigen, signierten
`Authorization: Bearer <JWS>` Header senden. Erst damit kann die Signatur gegen
`SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` produktiv bewiesen werden.

Bis dahin bleibt `scripts/samsung-wallet-final-readiness.js` bewusst auf
`EXTERNAL_BLOCKED` und `scripts/samsung-wallet-production-gate.js --strict`
darf nicht grün werden.
