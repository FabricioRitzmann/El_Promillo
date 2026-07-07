# Samsung Wallet Setup

Diese App nutzt für Samsung Wallet den Data-Fetch-Link-Flow.

## Flow

1. Die öffentliche Claim-Seite erkennt Samsung-Android-Geräte über `public/js/walletDeviceDetection.js` und priorisiert den Samsung-Wallet-Button. Apple und Google bleiben als manuelle Buttons sichtbar.
2. Die App erzeugt über `samsung-wallet-add-link` eine `refId`.
3. Die Function speichert diese `refId` in `samsung_wallet_instances`.
4. Der öffentliche Link zeigt auf `https://a.swallet.link/atw/v3/{certificateId}/{cardId}#Clip?pdata={refId}`.
5. Samsung ruft danach `samsung-wallet-server` auf:
   - `GET /cards/{cardId}/{refId}` für aktuelle Kartendaten
   - `POST /cards/{cardId}/{refId}?cc2=CH&event=ADDED` für Status-Callbacks

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
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server
```

Danach `supabase/schema.sql` vollständig ausführen, falls die Tabellen `samsung_wallet_instances` und `samsung_wallet_events` noch nicht in deinem Supabase-Projekt existieren.

## Security

- Browser bekommt keine Service Role, keine privaten Keys und kein Samsung-Zertifikat.
- Der öffentliche Samsung-Link enthält nur `refId`.
- `samsung-wallet-server` prüft standardmässig die Samsung Bearer-JWS-Signatur.
- `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` ist nur für Sandbox-Debugging und darf produktiv nicht gesetzt werden.

## Aktueller Stand

Serverseitige Samsung-Vorbereitung ist implementiert und die öffentliche Claim-Seite ist angebunden. iPhone/iPad priorisiert Apple Wallet, Samsung Android priorisiert Samsung Wallet, andere Android-Geräte priorisieren Google Wallet. Desktop oder unbekannte Geräte zeigen alle Wallet-Buttons als manuelle Auswahl.
