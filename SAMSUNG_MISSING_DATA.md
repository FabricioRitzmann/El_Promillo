# Samsung Wallet Missing Data

Status: no missing local Samsung credential data detected. The remaining
production item is an external Samsung Partner Server callback with a valid
`Authorization: Bearer <JWS>` header.

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

## Implemented Since This File Was Created

- Samsung local secrets were generated and remote Supabase Secrets were set.
- `samsung-wallet-add-link`, `samsung-wallet-server`, and `update-samsung-wallet-pass` were deployed.
- The Claim page and device detection now route Apple, Samsung, Google and manual choice correctly.
- Real Samsung handset testing reached the Edge Function and stored `get_card_data`.
- Because Samsung sandbox did not send `Authorization: Bearer <JWS>`, `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true` is temporarily active for testing only.
- `samsung-wallet-server` now accepts POST state data as query params, JSON body, or form body.
- Remote smoke testing verifies `send_card_state`, `last_event=ADDED`, and `card_status=active` through the sandbox fallback.

## Remaining External Production Proof

Samsung production must send a valid signed Partner Server authorization header:

```text
Authorization: Bearer <JWS>
```

Validate it with:

```bash
node scripts/samsung-wallet-partner-callback-test.js \
  --functions-base-url https://mfyltmjzofahbavrwpac.supabase.co/functions/v1 \
  --authorization-file tmp/samsung-bearer.txt \
  --strict
```

For production, set `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false`.

## Docs

- Samsung Key & Certificate Lifecycle: https://developer.samsung.com/wallet/securityauthentication/keycertificatelifecycle.html
- Samsung REST API Authorization Token: https://developer.samsung.com/wallet/securityauthentication/restapiauthorizationtoken.html
- Samsung Server Interaction: https://developer.samsung.com/wallet/api/server-interaction.html
