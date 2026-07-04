# Google Wallet manuell freischalten

Stand: Der Supabase-Teil ist vorbereitet. `google-wallet-save-link` erzeugt einen Google-Save-Link. Der direkte Google-Wallet-API-Test bricht aktuell ab, weil Google die Wallet API im Google-Cloud-Projekt noch als deaktiviert meldet.

## 1. Google Wallet API im Cloud-Projekt aktivieren

Öffne:

<https://console.developers.google.com/apis/api/walletobjects.googleapis.com/overview?project=elpromillo>

Falls Google ein anderes Projekt verlangt, nimm das Projekt aus `google-service-account.json`, Feld `project_id`.

Dann:

1. Mit dem Google-Konto anmelden, das Zugriff auf dieses Google-Cloud-Projekt hat.
2. Falls oben ein Projekt-Dropdown sichtbar ist: Projekt aus `google-service-account.json` auswählen.
3. Button `Enable` / `Aktivieren` klicken.
4. Zwei bis fünf Minuten warten.

Die offizielle Google-Doku nennt diesen Schritt als Pflicht fuer die REST API: <https://developers.google.com/wallet/generic/getting-started/auth/rest>

## 2. Service Account im Google Pay & Wallet Console autorisieren

Öffne:

<https://pay.google.com/business/console>

Dann:

1. In die Google Wallet API / Issuer-Konsole gehen.
2. Links `Users` / `Nutzer` öffnen.
3. `Invite a user` / `Nutzer einladen` klicken.
4. Die Service-Account-E-Mail aus `google-service-account.json` kopieren: Feld `client_email`.
5. Als Rolle `Developer` auswählen.
6. Einladung speichern.

Google beschreibt diesen Schritt ebenfalls offiziell als Pflicht fuer REST API Service Accounts: <https://developers.google.com/wallet/generic/getting-started/auth/rest>

## 3. Demo-Modus beachten

Neue Google-Wallet-Issuer sind zuerst im Demo-Modus. In diesem Modus können Karten nur von Admins, Developern oder eingetragenen Testkonten gespeichert werden.

Für Tests:

1. In der Google Pay & Wallet Console die Google Wallet API öffnen.
2. Bereich `Manage` suchen.
3. `Set up test accounts` öffnen.
4. Die Google-Mailadresse des Android-Testhandys eintragen.

Google beschreibt den Demo-Modus in der Issuer-Onboarding-Doku: <https://developers.google.com/wallet/generic/getting-started/issuer-onboarding>

## 4. Danach lokal erneut prüfen

Im Projektordner ausführen:

```bash
PATH="/Users/fabricio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/fabricio/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" node scripts/verify-google-wallet-api-access.js
```

Erwartetes Ergebnis:

```json
{
  "ok": true,
  "step": "wallet-api-access",
  "oauthToken": "ok"
}
```

`status: 404` ist dabei gut: Das bedeutet, die Test-Class existiert noch nicht, aber Service Account und Issuer-Zugriff funktionieren.

Wenn weiter `403` erscheint:

- API ist noch nicht aktiv oder noch nicht propagiert.
- Falsches Google-Cloud-Projekt ist ausgewählt.
- Service Account `client_email` wurde noch nicht als `Developer` im Wallet Issuer eingetragen.
- Das Android-Testkonto fehlt im Demo-Modus.
