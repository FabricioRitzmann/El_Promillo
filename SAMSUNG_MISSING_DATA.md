# Samsung Wallet Missing Data

Status: Samsung Wallet backend is prepared, but live production use still needs the Samsung public verification material and deployed Supabase secrets.

## Prepared In This Repo

- `supabase/functions/_shared/samsungWalletProvider.ts`
- `supabase/functions/samsung-wallet-add-link/index.ts`
- `supabase/functions/samsung-wallet-server/index.ts`
- `supabase/schema.sql` tables `samsung_wallet_instances` and `samsung_wallet_events`
- `supabase/config.toml` public JWT policy for Samsung callback/add-link functions
- `scripts/deploy-wallet-functions.sh` entries for both Samsung functions
- `supabase/secrets.example.env` Samsung placeholders

## Current Local Files

Do not commit these local credential files.

| File | Redacted finding | Result |
| --- | --- | --- |
| `env Samsung wallet.txt` | Contains partner/card metadata | Useful, but not a deploy secret by itself |
| `samsung-wallet-keys/samsung_wallet_private.key` | PEM RSA private key | Use as `SAMSUNG_WALLET_PRIVATE_KEY_PEM` secret |
| `samsung-wallet-keys/samsung_wallet.csr` | CSR matching the private key | Useful for Samsung certificate lifecycle, not a runtime secret |
| `:Users:fabricio:Desktop:pornwheel:samsung_env_values.txt` | RTF/plain text export with Samsung portal values | Useful for filling `supabase/secrets.local.env` |

## Still Needed For Live Samsung Wallet

| Exact value needed | Where to find it | Where to put it |
| --- | --- | --- |
| `SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM` | Samsung Wallet Partner Portal, certificate/public key used to verify Samsung's Partner Server API Bearer JWS. In the screenshots this is the "Samsung public key can be extracted from the certificate from Samsung" item. | Supabase Edge Secret |
| `SAMSUNG_WALLET_PRIVATE_KEY_PEM` | Local `samsung-wallet-keys/samsung_wallet_private.key`. | Supabase Edge Secret |
| `SAMSUNG_WALLET_PARTNER_SERVER_URL` | Use `https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server` after deploy. | Samsung Partner Portal and Supabase Edge Secret |
| `SAMSUNG_WALLET_RD_CLICK_URL` | Samsung Wallet Partner Portal -> Add to Wallet Script Guide. | Supabase Edge Secret |
| `SAMSUNG_WALLET_RD_IMPRESSION_URL` | Samsung Wallet Partner Portal -> Add to Wallet Script Guide. | Supabase Edge Secret |

## Why The Public Key Matters

Samsung calls this project with `Authorization: Bearer <JWS>` for:

- `GET /cards/{cardId}/{refId}`
- `POST /cards/{cardId}/{refId}`

The Edge Function can only safely accept these requests after it can verify the JWS signature with Samsung's public key/certificate. For sandbox debugging, `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` exists, but production must keep it `false`.

## Safe Next Commands

After secrets are filled in `supabase/secrets.local.env`:

```bash
bash scripts/set-supabase-secrets.sh --dry-run
bash scripts/set-supabase-secrets.sh
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server
```

Then register this Partner Server URL in Samsung:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server
```
