# Samsung Wallet Setup

Diese App nutzt für Samsung Wallet den Data-Fetch-Link-Flow.

## Flow

1. Die öffentliche Claim-Seite wird bei neuen QR-Codes über `/claim.html?token=<public_claim_token>` geöffnet. Alte `/claim.html?template=<template_id>` Links bleiben als Fallback gültig.
2. Die Claim-Seite erkennt Samsung-Android-Geräte über `public/js/walletDeviceDetection.js`. Der Hauptbutton `Zu Wallet hinzufügen` öffnet dann Samsung Wallet; Apple, Google und Samsung bleiben zusätzlich als manuelle Buttons sichtbar.
3. Die App erzeugt über `samsung-wallet-add-link` eine `refId`; bei Token-Claims validiert die Function serverseitig `public_claim_token`.
4. Die Function speichert diese `refId` in `samsung_wallet_instances`.
5. Der öffentliche Link zeigt auf `https://a.swallet.link/atw/v3/{certificateId}/{cardId}#Clip?pdata={refId}`.
6. Samsung ruft danach `samsung-wallet-server` auf:
   - `GET /cards/{cardId}/{refId}` für aktuelle Kartendaten
   - `POST /cards/{cardId}/{refId}` für Status-Callbacks. `event`/`cc2` werden als Query-Parameter, JSON-Body oder Form-Body akzeptiert.

## Supabase Secrets

In `supabase/secrets.local.env` eintragen und mit `bash scripts/set-supabase-secrets.sh` setzen:

```text
SAMSUNG_WALLET_PARTNER_ID=...
SAMSUNG_WALLET_PARTNER_CODE=...
SAMSUNG_WALLET_CARD_ID=...
SAMSUNG_WALLET_CARD_TYPE=loyalty
SAMSUNG_WALLET_CARD_SUB_TYPE=others
SAMSUNG_WALLET_CERTIFICATE_ID=...
SAMSUNG_WALLET_COUNTRY_CODE=CH
SAMSUNG_WALLET_ENV=sandbox
SAMSUNG_WALLET_ADD_FLOW=data_fetch
SAMSUNG_WALLET_PRIVATE_KEY_PEM=...
SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM=...
SAMSUNG_WALLET_RD_CLICK_URL=...
SAMSUNG_WALLET_RD_IMPRESSION_URL=...
SAMSUNG_WALLET_PARTNER_SERVER_URL=https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server
SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false
```

`SAMSUNG_WALLET_PRIVATE_KEY_PEM` kommt aus `samsung-wallet-keys/samsung_wallet_private.key` und muss zum Samsung-Partner-Zertifikat passen. `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` kommt aus dem Samsung-Zertifikat/Public-Key der Partner-Konsole.

## Samsung Partner Portal

1. Wallet Card öffnen.
2. Add to Wallet Script Guide prüfen.
3. Card ID, Partner Code, Certificate ID, RD Click URL und RD Impression URL übernehmen.
4. Data Fetch Link aktivieren.
5. Partner Server URL setzen:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server
```

6. Samsung Public Key oder Zertifikat herunterladen bzw. aus dem Portal kopieren und als `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` setzen.
7. Sicherstellen, dass der lokale Partner Private Key zum Samsung-Partner-Zertifikat passt. Falls der originale Private Key fehlt, die vorhandene CSR/Private-Key-Kombination neu im Samsung Portal hinterlegen und ein dazu passendes Partner-Zertifikat herunterladen.

## Deploy

```bash
bash scripts/set-supabase-secrets.sh --dry-run
bash scripts/set-supabase-secrets.sh
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server,update-samsung-wallet-pass
```

Danach `supabase/schema.sql` vollständig ausführen, falls die Tabellen `samsung_wallet_instances` und `samsung_wallet_events` noch nicht in deinem Supabase-Projekt existieren.

## Update und Cancel

`update-samsung-wallet-pass` ist eine geschützte Betreiber-Function. Sie akzeptiert `samsungInstanceId`, `refId` oder `customerCode` und `action=update|delete|revoke`.

- `update` ruft Samsung Update Notification auf und speichert `manual_update_requested`.
- `delete` ruft Samsung Delete-State über den Update-Endpunkt auf und speichert `manual_delete_requested`.
- `revoke` ruft Samsung Cancel Notification auf und speichert `manual_cancel_requested`.

Die Function nutzt `walletNotificationService.context(request)`, dadurch sind Login, `unlock=true` und Business-Zugehörigkeit Pflicht. Provider-Antworten werden redigiert zurückgegeben und in `samsung_wallet_events` auditiert.

## Partner Callback Test

Eine knappe Schritt-für-Schritt-Anleitung liegt zusätzlich in `docs/SAMSUNG_BEARER_TEST_GUIDE.md`.
Der aktuelle Requirement-Stand gegen den ursprünglichen Samsung-Zielprompt liegt
in `docs/SAMSUNG_WALLET_GOAL_AUDIT.md`.

Nach einem echten Handy- oder Test-Tool-Versuch kann die Callback-Spur geprüft
werden:

```bash
node scripts/samsung-wallet-callback-evidence.js
```

Das Script zeigt redigiert, ob `add_link_created`, `get_card_data`,
`send_card_state` oder `authorization_failed` Events angekommen sind. Zusätzlich
wertet es `auth_status` aus: `verified` ist der produktionsreife Nachweis,
`unverified_missing_authorization` oder fehlender Status bedeutet nur
Sandbox-/Alt-Event-Evidence. Für eine bestimmte Karte kann mit `--ref-id`,
`--customer-code` oder `--instance-id` gefiltert werden.

Der vorbereitete Gesamtcheck zeigt vor dem echten Bearer-Test, ob Code, Remote-Schema, Edge Functions und Samsung-Smoke-Test bereit sind:

```bash
node scripts/samsung-wallet-final-readiness.js \
  --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1
```

Ohne echten Samsung-Bearer meldet der Check `EXTERNAL_BLOCKED`, weil dieser Nachweis nur aus dem Samsung Test Tool oder von Samsung Wallet selbst kommen kann.

Für die echte externe Samsung-Abnahme brauchst du einen frischen `Authorization: Bearer <JWS>` Header aus dem Samsung Test Tool oder von einem echten Samsung-Wallet-Callback. Der Header ist methoden- und routengebunden; falls Samsung getrennte Header für GET und POST ausgibt, nutze getrennte Dateien:

```bash
node scripts/samsung-wallet-partner-callback-test.js \
  --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 \
  --get-authorization-file tmp/samsung-get-bearer.txt \
  --post-authorization-file tmp/samsung-post-bearer.txt \
  --strict
```

Wenn du nur GET Card Data prüfen willst:

```bash
node scripts/samsung-wallet-partner-callback-test.js \
  --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 \
  --authorization-file tmp/samsung-bearer.txt \
  --skip-post \
  --strict
```

Das Script nutzt die neueste `samsung_wallet_instances`-Zeile, falls `--card-id` und `--ref-id` nicht gesetzt sind. Es gibt Authorization Header, Secrets und vollständige Add-to-Wallet-URLs nicht aus.

## Production Gate

Vor einem echten Samsung-Livegang prüft ein separates Gate, ob die lokalen Samsung-Secrets produktionsfähig aussehen und ob ein Samsung-Callback-Bearer als externer Nachweis vorliegt:

```bash
node scripts/samsung-wallet-production-gate.js \
  --env-file supabase/secrets.local.env \
  --authorization-file tmp/samsung-bearer.txt \
  --strict
```

Dieses Gate verlangt unter anderem `SAMSUNG_WALLET_ENV=production`, `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false`, HTTPS-URLs, Samsung-Pflicht-Secrets und einen echten Samsung `Authorization: Bearer <JWS>` Callback-Nachweis. Es gibt Secrets, Zertifikate, Bearer und vollständige URLs nicht aus.

## Security

- Browser bekommt keine Service Role, keine privaten Keys und kein Samsung-Zertifikat.
- Neue QR-/Claim-Links enthalten nur `public_claim_token`, nicht die interne Template-ID; öffentliche Responses geben diesen Token nicht erneut aus.
- Der öffentliche Samsung-Link enthält nur `refId`.
- `samsung-wallet-server` prüft standardmässig die Samsung Bearer-JWS-Signatur.
- `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` ist nur für Sandbox-Debugging und darf produktiv nicht gesetzt werden. Wenn das Samsung Test Tool bzw. Samsung Wallet im Sandbox-Test den Partner-Server ohne `Authorization: Bearer <JWS>` aufruft, akzeptiert die Function diesen fehlenden Header nur mit diesem Flag und protokolliert den Vorgang über `get_card_data` bzw. `send_card_state`.
- Der Sandbox-Fallback ist hart deaktiviert, sobald `SAMSUNG_WALLET_ENV=production`, `prod` oder `live` gesetzt ist. In diesem Fall gibt der Server bei fehlendem Bearer `SAMSUNG_AUTHORIZATION_UNVERIFIED_PRODUCTION_DISABLED` zurück.

## Aktueller Stand

Serverseitige Samsung-Vorbereitung ist implementiert und die öffentliche Claim-Seite ist angebunden. iPhone/iPad öffnet über den Hauptbutton Apple Wallet, Samsung Android Samsung Wallet, andere Android-Geräte Google Wallet. Desktop oder unbekannte Geräte zeigen die Wallet-Buttons als manuelle Auswahl.

Stand 8. Juli 2026: Ein echter Samsung-Handy-Test hat `get_card_data` gegen die Supabase Edge Function ausgelöst. Weil Samsung im Sandbox-Test keinen Bearer mitsendete, ist remote temporär `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` aktiv. Der Remote-Smoke-Test prüft in diesem Modus zusätzlich `POST Card State`; `send_card_state`, `last_event=ADDED` und `card_status=active` werden korrekt gespeichert. Für Produktion muss `SAMSUNG_WALLET_ENV=production` und `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false` gesetzt sein; Samsung muss dann den signierten Bearer mitsenden.
