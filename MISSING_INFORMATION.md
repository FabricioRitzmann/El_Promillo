# Missing Information

Status: Samsung Wallet live activation is stopped by project rule 4.

The Samsung backend code, SQL additions, deployment hooks, setup docs and local
secret preparation are in place. The current local secret preparation detects 14
Samsung values from the project folder, but one required verification value is
still missing.

## What Is Missing

| Exact value | Why it is required | Required format | Where to put it |
| --- | --- | --- | --- |
| `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` | Samsung calls the Partner Server API with `Authorization: Bearer <JWS>`. The Edge Function must verify that signature before returning or updating card data. | PEM certificate or public key text, starting with `-----BEGIN CERTIFICATE-----` or `-----BEGIN PUBLIC KEY-----` | `samsung-wallet-keys/samsung_public_cert.pem`, then Supabase Edge Secret `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` |

## Where To Find It

Open the Samsung Wallet Partner Portal:

1. Go to the wallet card used for El Promillo.
2. Open the certificate/security area connected to the CSR/certificate lifecycle.
3. Find the certificate/public key supplied by Samsung. In the Samsung guide table this is described as the Samsung public key that can be extracted from the certificate from Samsung.
4. Download it if Samsung offers a `.cer`, `.crt` or `.pem` file.

Documentation references:

- Samsung Key & Certificate Lifecycle: https://developer.samsung.com/wallet/securityauthentication/keycertificatelifecycle.html
- Samsung REST API Authorization Token: https://developer.samsung.com/wallet/securityauthentication/restapiauthorizationtoken.html
- Samsung Server Interaction: https://developer.samsung.com/wallet/api/server-interaction.html

## Accepted File Formats

Preferred:

```text
samsung-wallet-keys/samsung_public_cert.pem
```

Also acceptable if downloaded from Samsung:

```text
samsung-wallet-keys/samsung_public_cert.cer
samsung-wallet-keys/samsung_public_cert.crt
```

If Samsung gives a `.cer` file, convert it with one of these commands:

```bash
openssl x509 -inform DER -in samsung-wallet-keys/samsung_public_cert.cer -out samsung-wallet-keys/samsung_public_cert.pem
```

If DER conversion fails because the file is already PEM text:

```bash
openssl x509 -inform PEM -in samsung-wallet-keys/samsung_public_cert.cer -out samsung-wallet-keys/samsung_public_cert.pem
```

## Current Local Evidence

Present locally:

- `samsung-wallet-keys/samsung_wallet_private.key`
- `samsung-wallet-keys/samsung_wallet.csr`
- Samsung partner/card values from the local Samsung env text files
- Samsung RD click and impression URLs from the local Samsung env text files
- Samsung Partner Server URL can be derived from the Supabase project URL

Still absent:

- `samsung-wallet-keys/samsung_public_cert.pem`
- `samsung-wallet-keys/samsung_public_cert.cer`
- `samsung-wallet-keys/samsung_public_cert.crt`

## Why Work Stops Here

Changing the public claim flow to automatically route Samsung devices would
touch Apple/Google-adjacent frontend behavior. Project rule 3 requires a separate
confirmation before that UI/device-detection change.

Deploying Samsung live without `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` would mean
the Partner Server API cannot safely verify Samsung callback signatures.

## Next Safe Step

Place the Samsung certificate/public key in:

```text
/Users/fabricio/Desktop/pornwheel/samsung-wallet-keys/samsung_public_cert.pem
```

Then rerun:

```bash
node scripts/prepare-supabase-secrets-local.js --json
```

Expected result after the file is present:

```text
Missing Samsung values: none
```
