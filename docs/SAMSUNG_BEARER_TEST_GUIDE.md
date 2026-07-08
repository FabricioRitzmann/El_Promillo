# Samsung Bearer Test Guide

Diese Datei beschreibt den letzten externen Samsung-Wallet-Test. Der Code, die Edge Functions und die lokalen Checks sind vorbereitet. Was noch fehlt, ist ein echter Samsung `Authorization: Bearer <JWS>` Header aus dem Samsung Wallet Partner Test Tool oder von einem echten Samsung-Wallet-Callback.

## Warum Der Bearer Gebraucht Wird

Samsung ruft beim Data-Fetch-Flow unsere Supabase Edge Function auf:

```text
https://mfyltmjzofahbavrwpac.supabase.co/functions/v1/samsung-wallet-server/cards/{cardId}/{refId}
```

Dabei sendet Samsung einen signierten Header:

```text
Authorization: Bearer <JWS>
```

Dieser Header beweist serverseitig, dass der Request wirklich von Samsung kommt und zur konkreten Route passt. Er kann nicht lokal erzeugt oder erraten werden.

## Variante A: Mit Samsung Handy

1. Samsung Wallet Partner Portal öffnen.
2. Deine Wallet Card öffnen.
3. Unten rechts **Add to Wallet Test Tool** öffnen.
4. Den angezeigten QR-Code mit einem Samsung Handy scannen.
5. Samsung Wallet startet den Add-to-Wallet-Test.
6. Im Test Tool oder Request-Log den Bereich **Request Headers** öffnen.
7. Den kompletten Header kopieren:

```text
Authorization: Bearer eyJ...
```

8. Datei im Projekt anlegen:

```text
/Users/fabricio/Desktop/pornwheel/tmp/samsung-bearer.txt
```

9. Genau eine Zeile einfügen:

```text
Authorization: Bearer eyJ...
```

10. Speichern und Codex schreiben:

```text
Ich habe den Samsung Bearer abgelegt.
```

## Variante B: Ohne Samsung Handy

Falls kein Samsung Handy vorhanden ist, im Samsung Partner Portal oder beim Samsung Support nach einem dieser Tests fragen:

```text
Data Fetch Test
Partner Server Test
Server API Test
Callback Test
```

Wichtig ist, dass Samsung einen echten Request gegen diese URL ausführt:

```text
https://mfyltmjzofahbavrwpac.supabase.co/functions/v1/samsung-wallet-server/cards/{cardId}/{refId}
```

Danach wird ebenfalls der Header aus dem Request benötigt:

```text
Authorization: Bearer <JWS>
```

## Testbefehl

Wenn der Header in `tmp/samsung-bearer.txt` liegt:

```bash
node scripts/samsung-wallet-partner-callback-test.js \
  --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1 \
  --authorization-file tmp/samsung-bearer.txt \
  --skip-post \
  --strict
```

Falls Samsung getrennte Bearer für GET und POST liefert:

```bash
node scripts/samsung-wallet-partner-callback-test.js \
  --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1 \
  --get-authorization-file tmp/samsung-get-bearer.txt \
  --post-authorization-file tmp/samsung-post-bearer.txt \
  --strict
```

## Erwartetes Ergebnis

Der echte GET-Test muss mindestens zeigen:

```text
OK   Samsung Instance
OK   GET Card Data
OK   GET Event Persisted
```

Mit POST zusätzlich:

```text
OK   POST Card State
OK   POST Event Persisted
OK   Samsung Card Status
```

## Häufige Fehler

- `SAMSUNG_AUTHORIZATION_REQUIRED`: Header fehlt, ist unvollständig oder nicht von Samsung.
- `SAMSUNG_AUTHORIZATION_API_MISMATCH`: Header gehört zu einer anderen Route, anderen `cardId`, anderen `refId` oder anderem HTTP-Methodentyp.
- `SAMSUNG_AUTHORIZATION_EXPIRED`: Header ist zu alt. Im Samsung Test Tool neu erzeugen.
- `SAMSUNG_AUTHORIZATION_SIGNATURE_INVALID`: Samsung Public Key / Zertifikat in den Supabase Secrets passt nicht.

## Sicherheit

- Den Bearer nicht auf GitHub hochladen.
- Den Bearer nicht in `config.json` oder `supabase/secrets.local.env` speichern.
- Nur lokal in `tmp/` ablegen.
- Das Testscript gibt Bearer, Secrets und vollständige Add-to-Wallet-URLs nicht aus.
