# Wallet Overview

El Promillo unterstützt serverseitig vorbereitete Wallet-Pfade für:

- Apple Wallet
- Google Wallet
- Samsung Wallet

Die aktuelle Detaildoku liegt hier:

- Apple/Google/Cron/Payment Abnahme: `docs/WALLET_EXTERNAL_ACCEPTANCE.md`
- Apple/Google Kontext: `docs/WALLET_INTEGRATION_CONTEXT.md`
- Samsung Setup: `docs/samsung-wallet.md`
- Provider-Struktur: `docs/provider-architecture.md`
- Setup: `docs/setup.md`

Für produktive Wallet-Aktionen müssen Supabase Secrets gesetzt, `supabase/schema.sql` ausgeführt und die Edge Functions deployed sein.

Neue QR-/Claim-Links werden über `card_templates.public_claim_token` erzeugt (`/claim.html?token=...`). Bestehende `/claim.html?template=...` Links bleiben als Kompatibilitäts-Fallback gültig.
