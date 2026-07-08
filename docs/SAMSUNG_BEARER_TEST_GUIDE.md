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

## Wichtig: Partner-Key-JWT Ist Nicht Derselbe Bearer

Ein lokal mit unserem `samsung_wallet_private.key` signierter JWT ist nützlich für Requests **von El Promillo zu Samsung**, zum Beispiel Update Notification oder Cancel Notification. Dafür erzeugt die App bereits serverseitig einen Samsung-kompatiblen Authorization Token in `supabase/functions/_shared/samsungWalletProvider.ts`.

Dieser lokal signierte Partner-JWT löst aber nicht den offenen Callback-Nachweis. Der fehlende Bearer für `samsung-wallet-server` muss von **Samsung zu El Promillo** kommen und mit Samsungs Private Key signiert sein. Unsere Edge Function prüft ihn mit `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM`.

Der Samsung-kompatible Authorization Token nutzt:

```text
JWS Header: cty=AUTH, ver=3, certificateId, partnerId, utc, alg=RS256
JWS Payload: API.method, API.path, optional refId
```

Ein generischer JWT mit `iss`, `sub`, `iat`, `exp` und `jti` ist daher nicht passend für diesen Samsung Partner-Server-Callback. Er würde bei uns spätestens mit `SAMSUNG_AUTHORIZATION_HEADER_INVALID` oder `SAMSUNG_AUTHORIZATION_API_MISMATCH` scheitern.

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

Vor dem echten Bearer-Test kannst du jederzeit prüfen, ob lokal und remote alles vorbereitet ist:

```bash
node scripts/samsung-wallet-final-readiness.js \
  --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1
```

Ohne Samsung-Bearer endet dieser Check bewusst mit `EXTERNAL_BLOCKED: 1`. Das bedeutet: Die vorbereitbaren Gates sind geprüft, aber der echte Samsung-Callback-Nachweis fehlt noch.

Direkt nach einem Handy- oder Test-Tool-Versuch kannst du prüfen, ob Samsung
überhaupt zurückgerufen hat:

```bash
node scripts/samsung-wallet-callback-evidence.js
```

Wichtig sind:

```text
OK               GET Card Data Evidence
OK               POST Card State Evidence
OK               Authorization Failures - Keine Authorization-Fehler ...
```

Falls `authorization_failed` erscheint, kam Samsung zwar bis zur Edge Function,
aber der Bearer fehlte, war abgelaufen oder passte nicht zur Route.

Wenn der Header in `tmp/samsung-bearer.txt` liegt:

```bash
node scripts/samsung-wallet-partner-callback-test.js \
  --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1 \
  --authorization-file tmp/samsung-bearer.txt \
  --skip-post \
  --strict
```

Oder als zusammengefasster finaler Check:

```bash
node scripts/samsung-wallet-final-readiness.js \
  --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1 \
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

Oder zusammengefasst:

```bash
node scripts/samsung-wallet-final-readiness.js \
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
