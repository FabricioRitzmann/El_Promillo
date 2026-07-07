# El Promillo Architecture Report

Erstellt: 2026-07-07

## Zielbild

Render hostet ausschliesslich das Backend:

- Express API
- Health Endpoint
- serverseitige Supabase Admin Zugriffe
- QR/PDF-Fallbacks
- lokale Claim-/Scanner-Fallback-APIs
- CORS fuer das externe Frontend

Das Frontend bleibt als statische GitHub-Pages-App bestehen:

- keine Verschiebung von `public/`
- keine UI-Aenderung
- keine CSS-Aenderung
- keine neue Frontend-Build-Struktur
- keine Render Static Site

## Architekturuebersicht

```text
GitHub Pages Frontend
  -> public/*.html
  -> public/js/*.js
  -> public/config.public.json
  -> Supabase Auth/Anon Client
  -> Render Backend API
  -> Supabase Edge Functions

Render Backend
  -> server/index.js
  -> server/config.js
  -> server/supabaseAdmin.js
  -> server/pdf.js
  -> server/cardEmblems.js
  -> Supabase Service Role

Supabase
  -> Database
  -> Auth
  -> Storage
  -> RLS/Policies
  -> Edge Functions
```

## Datei-Kategorien

### Frontend

- `index.html`
- `public/index.html`
- `public/account.html`
- `public/dashboard.html`
- `public/editor.html`
- `public/scanner.html`
- `public/claim.html`
- `public/wait.html`
- `public/styles.css`
- `public/config.public.json`
- `public/js/account.js`
- `public/js/auth.js`
- `public/js/cardEmblems.js`
- `public/js/claim.js`
- `public/js/config.js`
- `public/js/dashboard.js`
- `public/js/editor.js`
- `public/js/guards.js`
- `public/js/path.js`
- `public/js/scanner.js`
- `public/js/supabaseClient.js`
- `public/js/templateFeatures.js`
- `public/js/ui.js`
- `public/js/wait.js`
- `public/js/walletDeviceDetection.js`
- `public/assets/**`

### Backend

- `server/index.js`
- `server/config.js`
- `server/supabaseAdmin.js`
- `server/pdf.js`
- `server/cardEmblems.js`

### Shared

- `public/js/templateFeatures.js`
- `public/js/cardEmblems.js`

Diese Dateien werden sowohl vom Browser als auch vom Node-Backend importiert. Sie bleiben in der bestehenden Struktur.

### Config

- `.env.example`
- `config.example.json`
- `config.json` (lokal, nicht fuer Git)
- `public/config.public.json`
- `supabase/config.toml`
- `supabase/secrets.example.env`

### Deployment

- `render.yaml`
- `.gitignore`
- `.nojekyll`
- `docs/RENDER_DEPLOYMENT.md`
- `scripts/deploy-wallet-functions.sh`
- `scripts/set-supabase-secrets.sh`
- `scripts/apply-supabase-schema.sh`

### Supabase

- `supabase/schema.sql`
- `supabase/card-template-color-defaults.sql`
- `supabase/business-location.sql`
- `supabase/test-data.sql`
- `supabase/acceptance-queries.sql`
- `supabase/cron.example.sql`
- `supabase/functions/**`

### Wallet

- `supabase/functions/_shared/appleWalletProvider.ts`
- `supabase/functions/_shared/googleWalletProvider.ts`
- `supabase/functions/_shared/samsungWalletProvider.ts`
- `supabase/functions/_shared/walletProviderRegistry.ts`
- `supabase/functions/apple-wallet-webservice/index.ts`
- `supabase/functions/claim-apple-pass/index.ts`
- `supabase/functions/google-wallet-save-link/index.ts`
- `supabase/functions/samsung-wallet-add-link/index.ts`
- `supabase/functions/samsung-wallet-server/index.ts`
- `supabase/functions/update-apple-pass/index.ts`
- `supabase/functions/update-google-wallet-pass/index.ts`
- `supabase/functions/update-samsung-wallet-pass/index.ts`
- `certs/**`
- `samsung-wallet-keys/**`

### API

- `server/index.js`
- `supabase/functions/*/index.ts`

Render API Routen:

- `GET /api/config`
- `GET /health`
- `GET /api/health`
- `POST /api/statistics/scans`
- `GET /api/qrcode`
- `GET /api/templates/:templateId/qr.pdf`
- `GET /api/templates/:templateId`
- `POST /api/cards/claim`
- `POST /api/scanner/actions`
- `ALL /api/passes/:fileName`
- `ALL /api/passkit/*`

## Aktueller Konflikt

Vor der Umstellung bediente `server/index.js` neben API-Routen auch statische Dateien aus `public/` und leitete unbekannte Routen auf `public/index.html`.

Das widerspricht dem Ziel "Render hostet ausschliesslich das Backend".

## Umsetzungsentscheidung

Es wurde keine Datei verschoben und keine Frontend-Struktur geaendert.

Stattdessen steuert die neue Render-Env-Variable `SERVE_STATIC_FRONTEND=false`, dass Render keine statischen Frontend-Dateien ausliefert. Lokal bleibt die bisherige Entwicklungserfahrung erhalten, weil der Server ohne diese Env-Variable weiterhin statisch ausliefern kann.

## Ergebnis

- Render ist Backend-only.
- GitHub Pages bleibt Frontend-Host.
- Supabase bleibt Auth/Database/Storage/Realtime/Edge-Function-Plattform.
- Wallet Provider Secrets bleiben serverseitig.
- Das Frontend wurde nicht migriert, nicht verschoben und nicht neu strukturiert.
