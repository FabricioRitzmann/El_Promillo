# Archiv: alte PassKit-Konfiguration

Diese Anleitung ist nicht mehr der aktive Projektweg.

Das MVP verwendet keine lokale PassKit-Integration, keine `config.passkit`-Sektion, keine `passkit-generator` Dependency und keine `supabase/functions/passkit` Function mehr. Apple Wallet wird direkt über Supabase Edge Functions umgesetzt:

- `claim-apple-pass`
- `issue-apple-pass`
- `apple-wallet-webservice`
- `update-apple-pass`
- `send-apple-wallet-update`

Die Apple-Werte gehören als Supabase Secrets in die Edge Functions, nicht ins Frontend und nicht in eine lokale PassKit-Config:

```text
APPLE_TEAM_ID
APPLE_PASS_TYPE_ID
APPLE_WWDR_CERT
APPLE_PASS_CERT
APPLE_PASS_KEY
APPLE_PASS_KEY_PASSWORD
APPLE_WEB_SERVICE_BASE_URL
APPLE_APNS_KEY_ID
APPLE_APNS_TEAM_ID
APPLE_APNS_AUTH_KEY
```

Die aktuelle Setup-Checkliste steht in der README im Abschnitt `Supabase Secrets für direkte Wallet-Benachrichtigungen`.
