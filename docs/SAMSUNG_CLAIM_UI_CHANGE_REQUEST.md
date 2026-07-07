# Samsung Claim UI Implementation

Status: implemented after explicit confirmation on 2026-07-07.

The public claim page now connects Samsung Wallet without changing the existing
Apple and Google wallet functions. The main button `Zu Wallet hinzufügen`
uses device detection; the provider-specific buttons stay available manually.

## Confirmed Routing

| Device | Prioritized Wallet |
| --- | --- |
| iPhone | Apple Wallet |
| iPad | Apple Wallet |
| Android Samsung | Samsung Wallet |
| Android other manufacturer | Google Wallet |
| Desktop or unknown | Manual Wallet choice |

All provider buttons remain available manually:

- Apple Wallet
- Google Wallet
- Samsung Wallet

## Implemented Files

- `public/claim.html`
  - Adds `walletPrimaryButton`.
  - Adds `samsungWalletButton` next to Apple and Google.
- `public/js/claim.js`
  - Imports `detectWalletDevice` from `walletDeviceDetection.js`.
  - Routes `walletPrimaryButton` to Apple, Samsung or Google.
  - Routes Samsung Android to `samsung-wallet-add-link`.
  - Keeps iPhone/iPad on Apple and non-Samsung Android on Google.
  - Validates Samsung Add-Links before rendering or opening them.
- `public/js/walletDeviceDetection.js`
  - Detects Apple mobile, Samsung Android, other Android and manual/unknown devices.
- `scripts/verify-claim-page-output-safety.js`
  - Guards Apple, Google and Samsung output safety.
- `scripts/verify-wallet-device-detection.js`
  - Guards device routing.

## Security Notes

- Browser code never receives Samsung private keys, partner certificates or service role keys.
- The Samsung browser path calls only:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-add-link
```

- The returned URL is only accepted when it matches:

```text
https://a.swallet.link/atw/v3/...#Clip?pdata=...
```

## Data Model Note

Samsung remains a separate Data-Fetch flow using `samsung_wallet_instances`.
The existing Apple/Google `claim-card` flow and its `wallet_platform` constraints
stay unchanged.
