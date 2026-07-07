# Missing Information

Status: currently resolved for Samsung Wallet local credentials.

The old matching Samsung private key was found outside the project folder:

```text
/Users/fabricio/samsung-wallet-keys/samsung_wallet_private.key
```

It has been copied into the expected ignored project path:

```text
/Users/fabricio/Desktop/pornwheel/samsung-wallet-keys/samsung_wallet_private.key
```

The matching CSR was also copied:

```text
/Users/fabricio/Desktop/pornwheel/samsung-wallet-keys/samsung_wallet.csr
```

## Current Verification

Local verification now proves:

```text
Partner cert/key match: yes
CSR/key match: yes
Samsung ready: 15
Samsung missing: none
```

## Credential Files In Use

Do not commit these files.

| Purpose | Local file |
| --- | --- |
| Samsung partner private key | `samsung-wallet-keys/samsung_wallet_private.key` |
| Matching CSR | `samsung-wallet-keys/samsung_wallet.csr` |
| Samsung partner certificate | `samsung-wallet-keys/X303/el_promillo.crt` |
| Samsung server public certificate | `samsung-wallet-keys/samsung_public_cert.pem` |

## Next Safe Step

Prepare Samsung-only Supabase Secrets and deploy only the Samsung Edge Functions:

```bash
node scripts/prepare-supabase-secrets-local.js --write --force
bash scripts/set-supabase-secrets.sh --dry-run --env-file /tmp/samsung-secrets.env
bash scripts/deploy-wallet-functions.sh --only samsung-wallet-add-link,samsung-wallet-server
```

The public claim UI/device-detection change remains separate because it touches
Apple-/Google-adjacent frontend behavior and requires explicit confirmation under
project rule 3.
