# Apple-Wallet-Zertifikate

Dieser Ordner kann lokal als Ablage fuer Apple-Wallet-Zertifikate dienen. Die Dateien werden nicht committet und sollen produktiv als Supabase Secrets in die Edge Functions geladen werden.

Der aktive Projektweg verwendet keine lokale PassKit-Integration. Die Edge Functions erwarten diese Apple-Secrets:

```text
APPLE_WWDR_CERT
APPLE_PASS_CERT
APPLE_PASS_KEY
APPLE_PASS_KEY_PASSWORD
APPLE_APNS_AUTH_KEY
```

Typische lokale Quelldateien:

```text
certs/
  AppleWWDRCAG4.pem
  pass-cert.pem
  pass-key.pem
  AuthKey_XXXXXXXXXX.p8
```

Setze die Secrets zum Beispiel so:

```bash
supabase secrets set APPLE_WWDR_CERT="$(cat certs/AppleWWDRCAG4.pem)"
supabase secrets set APPLE_PASS_CERT="$(cat certs/pass-cert.pem)"
supabase secrets set APPLE_PASS_KEY="$(cat certs/pass-key.pem)"
supabase secrets set APPLE_PASS_KEY_PASSWORD="..."
supabase secrets set APPLE_APNS_AUTH_KEY="$(cat certs/AuthKey_XXXXXXXXXX.p8)"
```

Wichtig: Eine `.certSigningRequest`-Datei ist nicht der private Schluessel. Fuer die Signatur brauchst du den privaten Schluessel aus der macOS Schluesselbundverwaltung als PEM bzw. als Quelle fuer `APPLE_PASS_KEY`.
