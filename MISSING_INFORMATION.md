# Missing Information

Status: Samsung Wallet live activation is stopped by project rule 4.

The `X303` folder contains Samsung certificate material. The Samsung server
certificate has been prepared locally as `samsung-wallet-keys/samsung_public_cert.pem`,
so incoming Samsung Partner Server API signatures can be verified once deployed.

One required signing value is still not valid: the current local
`samsung-wallet-keys/samsung_wallet_private.key` does not match the partner
certificate from `X303/el_promillo.crt`.

## What Is Missing

| Exact value | Why it is required | Required format | Where to put it |
| --- | --- | --- | --- |
| `SAMSUNG_WALLET_PRIVATE_KEY_PEM` matching `X303/el_promillo.crt` | The Edge Function signs Samsung Authorization tokens with the partner private key. Samsung verifies those tokens with the public key from the partner certificate. If the private key does not match, Samsung will reject server requests. | PEM RSA private key, starting with `-----BEGIN PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----` | `samsung-wallet-keys/samsung_wallet_private.key`, then Supabase Edge Secret `SAMSUNG_WALLET_PRIVATE_KEY_PEM` |

## Current Local Evidence

Found in `samsung-wallet-keys/X303`:

- `el_promillo_walletsvc.samsung.com.crt`: Samsung server certificate, prepared as `samsung_public_cert.pem`.
- `el_promillo.crt`: partner certificate issued by Samsung.

Found elsewhere:

- `samsung-wallet-keys/samsung_wallet_private.key`: private key exists, but its public key does not match `X303/el_promillo.crt`.
- `samsung-wallet-keys/samsung_wallet.csr`: CSR exists and matches the current private key, but does not match `X303/el_promillo.crt`.

Current local secret-prep result:

```text
Samsung ready: 14
Samsung missing: SAMSUNG_WALLET_PRIVATE_KEY_PEM
```

## Where To Find The Missing Private Key

Samsung cannot give you this private key. It must be the private key that was
created on your computer when the CSR for `X303/el_promillo.crt` was generated.

Look for a file that may have been created together with the CSR, for example:

```text
private.key
partner.key
samsung.key
samsung_private.key
el_promillo.key
```

Possible places:

- Downloads folder
- Desktop
- old project folders
- wherever you generated the CSR before uploading it to Samsung

If you cannot find that matching private key, the safe alternative is:

1. Use the existing `samsung-wallet-keys/samsung_wallet.csr` and `samsung-wallet-keys/samsung_wallet_private.key` pair, because those two currently match each other.
2. Upload that CSR again in the Samsung Wallet Partner Portal.
3. Download the new partner certificate issued for that CSR.
4. Replace `samsung-wallet-keys/X303/el_promillo.crt` with the new partner certificate or save it as `samsung-wallet-keys/samsung_partner_cert.pem`.
5. Update the Samsung Certificate ID if Samsung gives you a new one.

## Why Work Stops Here

Changing the public claim flow to automatically route Samsung devices would touch
Apple/Google-adjacent frontend behavior. Project rule 3 requires a separate
confirmation before that UI/device-detection change.

Deploying Samsung live with a non-matching partner private key would create
Samsung links but fail during server authentication.

## Next Safe Step

Place the matching partner private key here:

```text
/Users/fabricio/Desktop/pornwheel/samsung-wallet-keys/samsung_wallet_private.key
```

Then rerun:

```bash
node scripts/prepare-supabase-secrets-local.js --json
```

Expected result after the correct private key is present:

```text
Missing Samsung values: none
```
