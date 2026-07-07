# Wallet Provider Architecture

Die App hält Wallet-Provider serverseitig in Supabase Edge Functions. Secrets bleiben in Supabase Secrets und werden nicht in `public/js` geladen.

## Provider

- Apple: `supabase/functions/_shared/appleWalletProvider.ts`
- Google: `supabase/functions/_shared/googleWalletProvider.ts`
- Samsung: `supabase/functions/_shared/samsungWalletProvider.ts`

## Samsung Provider Methoden

`samsungWalletProvider` stellt die MVP-Methoden bereit:

- `create(template, instance)`
- `update(instance, fields)`
- `delete(instance)`
- `revoke(instance)`
- `generateAddLink(template, instance)`
- `generateQRCode(template, instance)`
- `detectSupport(userAgent)`
- `serialize(value)`
- `deserialize(value)`
- `mapping(template, instance, options)`

Zusätzlich:

- `cardDataForInstance(...)` baut die Samsung Card-Data-Antwort.
- `verifyPartnerServerAuthorization(...)` prüft Samsung Bearer-JWS.
- `signAuthorizationToken(...)` signiert ausgehende Samsung Server API Calls.

## Staging-Entscheid

Samsung ist zunächst additiv umgesetzt:

- eigene Tabellen: `samsung_wallet_instances`, `samsung_wallet_events`
- eigene Functions: `samsung-wallet-add-link`, `samsung-wallet-server`, `update-samsung-wallet-pass`
- keine Änderung an bestehenden `wallet_platform` Constraints für Apple/Google
- Claim-UI ist nach Freigabe additiv angebunden: Samsung Android wird priorisiert, Apple/Google bleiben verfügbar

So bleibt Apple/Google stabil, während Samsung serverseitig vorbereitet ist.
