# Archiv: alter PassKit-Weg

Diese Datei bleibt nur als Hinweis für alte Links bestehen. Der hier früher beschriebene lokale PassKit-Weg ist im Projekt nicht mehr aktiv.

Aktueller Stand:

- `server/passkit.js` wurde entfernt.
- `passkit-generator` wurde aus den Dependencies entfernt.
- `supabase/functions/passkit` wurde entfernt.
- `/api/passes/:cardId.pkpass` und `/api/passkit/*` antworten lokal nur noch mit `410 LEGACY_PASSKIT_ROUTE_DISABLED`.
- Apple Wallet wird direkt über `claim-apple-pass`, `issue-apple-pass` und `apple-wallet-webservice` bedient.
- Google Wallet wird direkt über `google-wallet-save-link`, `issue-google-wallet-pass`, `update-google-wallet-pass` und `send-google-wallet-message` bedient.

Nutze für das aktuelle Setup die README-Abschnitte zu Supabase Secrets, Edge Function Deploys und direkter Apple-/Google-Wallet-Integration.
