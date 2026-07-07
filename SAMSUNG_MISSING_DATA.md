# Samsung Wallet Missing Data

Status: Samsung Wallet backend is prepared, and the Samsung server certificate
from `X303` has been found. Live activation is still blocked because the partner
private key does not match the partner certificate.

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
| `samsung-wallet-keys/X303/el_promillo_walletsvc.samsung.com.crt` | Samsung server certificate | Copied to `samsung-wallet-keys/samsung_public_cert.pem` |
| `samsung-wallet-keys/X303/el_promillo.crt` | Samsung-issued partner certificate | Does not match the current local private key |
| `samsung-wallet-keys/samsung_wallet_private.key` | PEM RSA private key | Exists, but does not match `X303/el_promillo.crt` |
| `samsung-wallet-keys/samsung_wallet.csr` | CSR matching the current private key | Does not match `X303/el_promillo.crt` |

Local secret-prep status:

```text
Ready Samsung values: 14
Missing Samsung values: SAMSUNG_WALLET_PRIVATE_KEY_PEM
```

## Still Needed For Live Samsung Wallet

| Exact value needed | Where to find it | Why it is needed | Required format | Where to put it |
| --- | --- | --- | --- | --- |
| `SAMSUNG_WALLET_PRIVATE_KEY_PEM` matching `X303/el_promillo.crt` | The machine/folder where the CSR for `X303/el_promillo.crt` was originally generated. Samsung does not store or provide this private key. | Signs partner Authorization tokens. Samsung verifies them with the public key from the partner certificate. | PEM RSA private key beginning with `-----BEGIN PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----` | `samsung-wallet-keys/samsung_wallet_private.key`, then Supabase Edge Secret |

## Why The Matching Private Key Matters

This project signs outgoing Samsung Authorization tokens with
`SAMSUNG_WALLET_PRIVATE_KEY_PEM`. Samsung validates those tokens against the
partner certificate associated with the Samsung Certificate ID. If the private
key and certificate do not belong together, Samsung rejects the request.

The local check found:

- current private key and current CSR match each other
- `X303/el_promillo.crt` does not match that private key/CSR

## Safe Recovery Options

Option A, preferred if possible:

1. Find the original private key that was generated together with the CSR used
   for `X303/el_promillo.crt`.
2. Save it as:

```text
samsung-wallet-keys/samsung_wallet_private.key
```

Option B, if the original private key is lost:

1. Keep the current matching pair:

```text
samsung-wallet-keys/samsung_wallet_private.key
samsung-wallet-keys/samsung_wallet.csr
```

2. Upload `samsung-wallet-keys/samsung_wallet.csr` again in the Samsung Wallet
   Partner Portal.
3. Download the newly issued partner certificate.
4. Save it as one of:

```text
samsung-wallet-keys/X303/el_promillo.crt
samsung-wallet-keys/samsung_partner_cert.pem
```

5. Update `SAMSUNG_WALLET_CERTIFICATE_ID` if Samsung gives you a new certificate ID.

## Safe Next Commands After The Matching Key/Cert Pair Exists

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
