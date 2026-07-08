# Missing Information

Status: local Samsung Wallet credentials are resolved. The remaining item is
external production authorization proof from Samsung.

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

## Implemented Since This File Was Created

- Samsung Supabase Secrets were prepared and set.
- Samsung Edge Functions were deployed.
- The public Claim page now routes iPhone/iPad to Apple Wallet, Samsung Android to Samsung Wallet, other Android devices to Google Wallet, and desktop/unknown devices to manual choice.
- Real Samsung handset testing reached `samsung-wallet-server` and produced `get_card_data` events.
- The sandbox fallback was enabled temporarily because Samsung's sandbox callback arrived without `Authorization: Bearer <JWS>`.
- The Samsung POST state path is now remote-tested through the sandbox fallback and stores `send_card_state`, `last_event=ADDED`, and `card_status=active`.

## Remaining External Item

For production, Samsung must call the Partner Server with a valid signed header:

```text
Authorization: Bearer <JWS>
```

Until that production callback is confirmed, `SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true`
is only a sandbox/debug setting and must be set back to `false` before a real launch.
