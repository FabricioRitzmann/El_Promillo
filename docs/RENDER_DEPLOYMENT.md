# Render Deployment Guide

## Analyse

- Projektordner: `/Users/fabricio/Desktop/pornwheel`
- Framework: Node.js/Express mit statischen Dateien aus `public/`
- Kein React, kein Vite, kein Next.js; kein Dockerfile
- Deployment-Typ: Render Web Service, nicht Static Site
- Package Manager: `pnpm`, erkennbar an `pnpm-lock.yaml`
- Build Command: `pnpm install --frozen-lockfile && pnpm run build`
- Start Command: `pnpm start`
- Health Check: `/api/health`
- Render Blueprint: `render.yaml`

Wichtige Dateien:

- `server/index.js`: Express Server, API-Routen, statische Auslieferung, Health Check
- `server/config.js`: Konfiguration aus `config.example.json`, optional `config.json` und Render Env Vars
- `server/supabaseAdmin.js`: serverseitiger Supabase Client mit Service Role Key
- `public/js/config.js`: Browser lädt nur `/api/config`
- `public/js/supabaseClient.js`: Browser nutzt Supabase URL und Anon Key
- `supabase/schema.sql`: Tabellen, RLS Policies, Grants, Storage Policies
- `supabase/config.toml`: Edge Function JWT-Policy
- `supabase/functions/*`: Wallet-, Scanner-, Payment-, Cron- und Statistik-Functions
- `supabase/secrets.example.env`: Vorlage für Supabase Edge Function Secrets
- `.env.example`: Vorlage für Render Web Service Env Vars

## Render Empfehlung

Dieses Projekt braucht einen Render Web Service, weil `server/index.js` eigene API-Routen bereitstellt und serverseitig `SUPABASE_SERVICE_ROLE_KEY` nutzt. Ein Static Site Deployment waere nicht passend, weil `/api/config`, QR/PDF, lokale Fallback-Claims, Scanner-Fallbacks und serverseitige Supabase-Admin-Abfragen nicht laufen wuerden.

`render.yaml` definiert:

- `runtime: node`
- `plan: free`
- `region: frankfurt`
- `buildCommand: pnpm install --frozen-lockfile && pnpm run build`
- `startCommand: pnpm start`
- `healthCheckPath: /api/health`

## Render Environment Variables

In Render setzen:

```text
APP_PUBLIC_BASE_URL=https://<render-service>.onrender.com
APP_API_BASE_URL=https://<render-service>.onrender.com
CORS_ORIGIN=https://<render-service>.onrender.com
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_FUNCTION_BASE_URL=https://<PROJECT_REF>.supabase.co/functions/v1
```

Render setzt `PORT` automatisch. `HOST=0.0.0.0`, `NODE_ENV=production` und die nicht-sensitiven Wallet-Limits sind bereits in `render.yaml` vorbereitet.

Nicht in Render setzen, sofern die Wallet-Logik weiter in Supabase Edge Functions laeuft:

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
GOOGLE_WALLET_ISSUER_ID
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON
PAYMENT_WEBHOOK_SECRET
WALLET_CRON_SECRET
```

Diese Werte gehoeren in Supabase Edge Function Secrets. Vorlage: `supabase/secrets.example.env`.

## Supabase

Der Browser erhaelt ueber `/api/config` nur:

- App/Public URLs
- Supabase URL
- Supabase Anon Key
- nicht-sensitive Delivery Rules

Der Service Role Key bleibt serverseitig in Render oder Supabase Edge Functions. Apple-/Google-Wallet-, Payment- und Cron-Secrets werden in den Edge Functions ueber `Deno.env.get(...)` gelesen.

Schema/RLS:

- `supabase/schema.sql` aktiviert Row Level Security fuer die App-Tabellen.
- Operator-Policies beschraenken Reads/Writes auf eigene Betreiber-, Business-, Template- und Karten-Daten.
- Storage Policies sind fuer `wallet-assets`, `business-logos` und `wallet-emblems` vorbereitet.
- Keine destruktiven Production-Migrationen ohne Backup und manuelle Bestaetigung ausfuehren.

Migration anwenden:

```bash
bash scripts/apply-supabase-schema.sh
```

Edge Functions deployen:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
bash scripts/deploy-wallet-functions.sh --dry-run
bash scripts/deploy-wallet-functions.sh
```

Secrets setzen:

```bash
supabase secrets set --env-file supabase/secrets.local.env
```

`supabase/secrets.local.env` bleibt lokal und ist ignoriert.

## Security Check

Lokale Credential-Dateien sind vorhanden und duerfen nicht versioniert werden:

- Apple `.p8`, `.pem`, `.p12`, `.cer` Dateien
- Google Service Account JSON Dateien
- lokale Supabase Token/Secrets Dateien
- `config.json`
- `supabase/secrets.local.env`

`.gitignore` blockiert diese Dateien sowie `.env*`, `certs/*`, `tmp/`, `backups/`, Build-Ausgaben und Service-Account-Muster. Falls diese Dateien jemals in ein Remote-Repo gepusht wurden, die zugehoerigen Keys rotieren.

## Supabase Auth Checklist

Im Supabase Dashboard nach dem Render Deploy setzen:

- Site URL: `https://<render-service>.onrender.com`
- Redirect URLs:
  - `https://<render-service>.onrender.com`
  - `https://<render-service>.onrender.com/*`
- Bei Custom Domain zusaetzlich:
  - `https://<deine-domain.ch>`
  - `https://<deine-domain.ch>/*`

Danach testen:

- Registrierung/Login
- Session Refresh
- Logout
- Passwort Reset oder Magic Link, falls aktiviert
- nicht freigeschaltete Betreiber landen auf der Warteseite
- freigeschaltete Betreiber landen im Dashboard

## Render Deployment Checklist

1. Git-Repo initialisieren oder bestehendes Repo verwenden.
2. Sicherstellen, dass lokale Secret-Dateien nicht getrackt sind.
3. `pnpm install --frozen-lockfile` lokal ausfuehren.
4. `pnpm run build` lokal ausfuehren.
5. `pnpm check` lokal ausfuehren, falls die komplette Abnahme gewuenscht ist.
6. Code zu GitHub/GitLab/Bitbucket pushen.
7. In Render eine Blueprint-Deploy-Erstellung mit `render.yaml` starten oder manuell einen Web Service anlegen.
8. Build Command: `pnpm install --frozen-lockfile && pnpm run build`.
9. Start Command: `pnpm start`.
10. Health Check Path: `/api/health`.
11. Render Env Vars setzen.
12. Deploy starten und Logs pruefen.
13. `https://<render-service>.onrender.com/api/health` pruefen.
14. Supabase Auth Redirect URLs aktualisieren.
15. Edge Functions deployen und Supabase Secrets setzen.
16. Smoke Test gegen die Render URL ausfuehren:

```bash
node scripts/wallet-smoke-test.js --base-url https://<render-service>.onrender.com --strict
```

17. Produktiv testen: Login, Firmenlogo, Dashboard, Editor, Scanner, Besucherstatistik, QR/PDF, Claim-Seite, Apple Wallet, Google Wallet und Topup/Payment.

## Aktuelle Einschraenkung

Der lokale Ordner ist aktuell kein Git-Repository. Render Blueprint Deployments lesen `render.yaml` aus einem Git-Remote. Vor dem echten Deploy muss das Projekt daher in ein GitHub/GitLab/Bitbucket Repo gepusht werden.
