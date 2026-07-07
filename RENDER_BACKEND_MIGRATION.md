# Render Backend-Only Migration

Erstellt: 2026-07-07

## Aktuelle Konfiguration vor der Korrektur

Render lief als Node Web Service, aber `server/index.js` lieferte auch statische Frontend-Dateien aus:

- `app.use(express.static(publicDir))`
- `app.get('*', ...)` mit `public/index.html`

Dadurch konnte Render neben der API auch Frontend-Seiten bedienen.

## Neue Backend-Konfiguration

Render bleibt ein Node Web Service, hostet aber nur Backend-Routen.

Render Blueprint:

```yaml
type: web
runtime: node
buildCommand: pnpm install --frozen-lockfile && pnpm run build
startCommand: pnpm start
healthCheckPath: /api/health
```

Neue Env-Variable:

```text
SERVE_STATIC_FRONTEND=false
```

Damit antwortet Render fuer Frontend-Seiten mit `404 FRONTEND_NOT_HOSTED_ON_RENDER`, bedient aber weiterhin:

- `/api/config`
- `/health`
- `/api/health`
- `/api/qrcode`
- `/api/templates/:templateId`
- `/api/templates/:templateId/qr.pdf`
- `/api/cards/claim`
- `/api/scanner/actions`

## Frontend-Host

Das Frontend bleibt auf GitHub Pages:

```text
https://fabricioritzmann.github.io/El_Promillo/
https://fabricioritzmann.github.io/El_Promillo/public/
```

Die statische Frontend-Konfiguration nutzt:

```text
app.apiBaseUrl=https://el-promillo-j1n0.onrender.com
```

## Render Environment Variables

In Render muessen diese Werte gesetzt sein:

```text
NODE_ENV=production
HOST=0.0.0.0
SERVE_STATIC_FRONTEND=false
APP_PUBLIC_BASE_URL=https://fabricioritzmann.github.io/El_Promillo/public/
APP_API_BASE_URL=https://el-promillo-j1n0.onrender.com
CORS_ORIGIN=https://fabricioritzmann.github.io
SUPABASE_URL=https://mfyltmjzofahbavrwpac.supabase.co
SUPABASE_ANON_KEY=<redacted>
SUPABASE_SERVICE_ROLE_KEY=<redacted>
SUPABASE_FUNCTION_BASE_URL=https://mfyltmjzofahbavrwpac.supabase.co/functions/v1
```

## Manuelle Schritte in Render

Keine manuellen Render-Schritte sind erforderlich, solange der Blueprint mit GitHub verbunden bleibt und Auto-Sync aktiv ist.

Falls Render den Blueprint nicht automatisch synchronisiert:

1. Render Dashboard oeffnen.
2. Blueprint `El_Promillo_2` oeffnen.
3. Sync/Apply fuer den neuesten Commit starten.
4. Deploy-Status auf `live` pruefen.

## Manuelle Schritte ausserhalb von Render

Supabase Auth sollte weiterhin die GitHub-Pages-URLs erlauben:

```text
https://fabricioritzmann.github.io/El_Promillo/
https://fabricioritzmann.github.io/El_Promillo/*
https://fabricioritzmann.github.io/El_Promillo/public/
https://fabricioritzmann.github.io/El_Promillo/public/*
```

Bei Bedarf kann die Render-Backend-URL ebenfalls als Redirect URL eingetragen bleiben, sie hostet aber nicht mehr das Frontend.

## Rollback

1. In Render `SERVE_STATIC_FRONTEND=true` setzen oder die Env-Variable entfernen.
2. Deploy neu starten.
3. Dann bedient `server/index.js` lokal/auf Render wieder statische Dateien aus `public/`.

Das Rollback veraendert keine Supabase-Daten.
