# Samsung Wallet Missing Data

Status: Samsung Wallet backend is prepared, but live activation still needs one
Samsung verification artifact.

## Prepared In This Repo

- `supabase/functions/_shared/samsungWalletProvider.ts`
- `supabase/functions/samsung-wallet-add-link/index.ts`
- `supabase/functions/samsung-wallet-server/index.ts`
- `supabase/schema.sql` tables `samsung_wallet_instances` and `samsung_wallet_events`
- `supabase/config.toml` public JWT policy for Samsung callback/add-link functions
- `scripts/deploy-wallet-functions.sh` entries for both Samsung functions
- `supabase/secrets.example.env` Samsung placeholders
- `scripts/prepare-supabase-secrets-local.js` Samsung local secret preparation
- `docs/samsung-wallet.md`
- `docs/provider-architecture.md`
- `docs/setup.md`
- `REPORT.md`

## Current Local Files

Do not commit these local credential files.

| File | Redacted finding | Result |
| --- | --- | --- |
| `env Samsung wallet.txt` | Contains partner/card metadata and tracking URLs | Used by the local secret-prep script |
| `:Users:fabricio:Desktop:pornwheel:samsung_env_values.txt` | Contains exported Samsung portal values | Used by the local secret-prep script |
| `samsung-wallet-keys/samsung_wallet_private.key` | PEM RSA private key | Used as `SAMSUNG_WALLET_PRIVATE_KEY_PEM` |
| `samsung-wallet-keys/samsung_wallet.csr` | CSR matching the private key | Useful for Samsung certificate lifecycle, not a runtime secret |

Local secret-prep status:

```text
Ready Samsung values: 14
Missing Samsung values: SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM
```

## Still Needed For Live Samsung Wallet

| Exact value needed | Samsung menu/location | Why it is needed | Required format | Where to put it |
| --- | --- | --- | --- | --- |
| `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` | Samsung Wallet Partner Portal -> wallet card/certificate/security area. In the guide table this is the Samsung public key extracted from the certificate from Samsung. | Verifies incoming Samsung Partner Server API Bearer JWS before card data is returned or card state is changed. | PEM certificate/public key text: `-----BEGIN CERTIFICATE-----` or `-----BEGIN PUBLIC KEY-----` | `samsung-wallet-keys/samsung_public_cert.pem`, then Supabase Edge Secret |

## Why The Public Key Matters

Samsung calls this project with `Authorization: Bearer <JWS>` for:

- `GET /cards/{cardId}/{refId}`
- `POST /cards/{cardId}/{refId}`

The Edge Function can only safely accept these requests after it can verify the
JWS signature with Samsung's public key/certificate. For sandbox debugging,
`SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` exists, but production must keep it
`false`.

## Accepted Local Filenames

Preferred:

```text
samsung-wallet-keys/samsung_public_cert.pem
```

If Samsung downloads a certificate as `.cer` or `.crt`, place it temporarily as:

```text
samsung-wallet-keys/samsung_public_cert.cer
samsung-wallet-keys/samsung_public_cert.crt
```

Then convert it to PEM:

```bash
openssl x509 -inform DER -in samsung-wallet-keys/samsung_public_cert.cer -out samsung-wallet-keys/samsung_public_cert.pem
```

If that fails because the file is already PEM text:

```bash
openssl x509 -inform PEM -in samsung-wallet-keys/samsung_public_cert.cer -out samsung-wallet-keys/samsung_public_cert.pem
```

## Safe Next Commands After The File Exists

```bash
node scripts/prepare-supabase-secrets-local.js --json
node scripts/prepare-supabase-secrets-local.js --write --force
bash scripts/set-supabase-secrets.sh --dry-run
bash scripts/set-supabase-secrets.sh
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server
```

Then register this Partner Server URL in Samsung:

```text
https://mfyltmjzofahbavrwpac.supabase.co/functions/v1/samsung-wallet-server
```

## Docs

- Samsung Key & Certificate Lifecycle: https://developer.samsung.com/wallet/securityauthentication/keycertificatelifecycle.html
- Samsung REST API Authorization Token: https://developer.samsung.com/wallet/securityauthentication/restapiauthorizationtoken.html
- Samsung Server Interaction: https://developer.samsung.com/wallet/api/server-interaction.html
