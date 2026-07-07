# Frontend Impact

Erstellt: 2026-07-07

## Betroffene Frontend-nahe Datei

- `public/config.public.json`

## Weshalb diese Datei betroffen ist

Die statische GitHub-Pages-App liest ihre oeffentliche Browser-Konfiguration aus `public/config.public.json`.

Der Wert `app.apiBaseUrl` zeigte noch auf:

```text
https://el-promillo.onrender.com
```

Dieser Render-Service ist nicht der aktive Backend-Service. Der aktive Backend-Service ist:

```text
https://el-promillo-j1n0.onrender.com
```

## Durchgefuehrte Aenderung

Nur die Backend-URL wurde angepasst:

```text
app.apiBaseUrl=https://el-promillo-j1n0.onrender.com
```

## Nicht geaendert

- keine HTML-Datei
- keine CSS-Datei
- keine UI-Komponente
- kein Frontend-Routing
- keine Frontend-Build-Konfiguration
- keine Ordnerstruktur

## Alternative

Eine Alternative waere, die Backend-URL zur Build-/Publish-Zeit in die statische Konfiguration zu schreiben. Das Projekt nutzt aktuell aber keine separate Frontend-Build-Pipeline fuer GitHub Pages.

## Empfehlung

Die aktuelle minimale Konfigurationsaenderung beibehalten. Sie ist notwendig, damit das bestehende Frontend das aktive Render-Backend erreicht, ohne die Frontend-Struktur zu veraendern.
