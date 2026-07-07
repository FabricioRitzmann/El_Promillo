# Samsung Wallet Missing Data

Status: no missing local Samsung credential data detected.

The matching old Samsung private key was found at:

```text
/Users/fabricio/samsung-wallet-keys/samsung_wallet_private.key
```

It has been copied into the ignored project credential folder:

```text
/Users/fabricio/Desktop/pornwheel/samsung-wallet-keys/samsung_wallet_private.key
```

The Samsung server certificate from `X303` is prepared as:

```text
/Users/fabricio/Desktop/pornwheel/samsung-wallet-keys/samsung_public_cert.pem
```

## Current Local Files

Do not commit these local credential files.

| File | Redacted finding | Result |
| --- | --- | --- |
| `env Samsung wallet.txt` | Contains partner/card metadata and tracking URLs | Used by the local secret-prep script |
| `:Users:fabricio:Desktop:pornwheel:samsung_env_values.txt` | Contains exported Samsung portal values | Used by the local secret-prep script |
| `samsung-wallet-keys/X303/el_promillo_walletsvc.samsung.com.crt` | Samsung server certificate | Copied to `samsung-wallet-keys/samsung_public_cert.pem` |
| `samsung-wallet-keys/X303/el_promillo.crt` | Samsung-issued partner certificate | Matches the current local private key |
| `samsung-wallet-keys/samsung_wallet_private.key` | PEM RSA private key | Matches `X303/el_promillo.crt` |
| `samsung-wallet-keys/samsung_wallet.csr` | CSR | Matches the current private key |

Local secret-prep status:

```text
Ready Samsung values: 15
Missing Samsung values: none
```

## Next Safe Commands

Generate the ignored local secrets file:

```bash
node scripts/prepare-supabase-secrets-local.js --write --force
```

Deploy only Samsung secrets and functions. Avoid touching Apple/Google secrets
unless explicitly intended:

```bash
bash scripts/set-supabase-secrets.sh --dry-run --env-file /tmp/samsung-secrets.env
bash scripts/set-supabase-secrets.sh --env-file /tmp/samsung-secrets.env
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server
```

Then register this Partner Server URL in Samsung:

```text
https://mfyltmjzofahbavrwpac.supabase.co/functions/v1/samsung-wallet-server
```

## Still Separate By Rule 3

The public claim UI/device-detection update is not yet applied. It affects
Apple-/Google-adjacent frontend behavior and must be confirmed separately before
implementation.

## Docs

- Samsung Key & Certificate Lifecycle: https://developer.samsung.com/wallet/securityauthentication/keycertificatelifecycle.html
- Samsung REST API Authorization Token: https://developer.samsung.com/wallet/securityauthentication/restapiauthorizationtoken.html
- Samsung Server Interaction: https://developer.samsung.com/wallet/api/server-interaction.html
