# Samsung Claim UI Change Request

Status: awaiting explicit confirmation under project rule 3.

Samsung backend, secrets, tables and Edge Functions are deployed and smoke-tested.
The remaining end-to-end product step is to connect Samsung Wallet to the public
claim page.

## Why Confirmation Is Required

The public claim page is the shared Wallet Confirmation Page for Apple and
Google. Adding Samsung there changes provider selection behavior for the same
customer button flow.

Project rule 3 says that changes affecting Apple or Google Wallet must stop,
explain affected files and wait for confirmation.

## Affected Files

- `public/claim.html`
  - Add a manual Samsung button next to Apple and Google.
- `public/js/claim.js`
  - Replace local Apple/Google-only detection with `walletDeviceDetection.js`.
  - Route Samsung Android to `samsung-wallet-add-link`.
  - Keep iPhone/iPad on Apple and non-Samsung Android on Google.
  - Keep Desktop/unknown as manual provider choice.
- `public/styles.css`
  - Only if a third button needs spacing tweaks.
- Optional verifier scripts
  - Extend claim-output/static checks so Apple, Google and Samsung buttons stay present.

## Already Prepared Safely

- `public/js/walletDeviceDetection.js`
  - Isolated browser-safe detection utility.
  - Not imported by `claim.js` yet, so current Apple/Google behavior is unchanged.
- `scripts/verify-wallet-device-detection.js`
  - Tests iPhone, iPad desktop mode, Samsung Android, other Android and Desktop/manual choice.
- `scripts/samsung-wallet-smoke-test.js`
  - Verifies Samsung Add-Link, `pdata` flow, DB persistence and unauthorized Partner Server gate.

## Intended Routing After Confirmation

| Device | Default main button |
| --- | --- |
| iPhone | Apple Wallet |
| iPad | Apple Wallet |
| Android Samsung | Samsung Wallet |
| Android other manufacturer | Google Wallet |
| Desktop or unknown | Manual Wallet choice |

Manual provider buttons should remain available:

- Apple Wallet
- Google Wallet
- Samsung Wallet

## Safer Implementation Plan

1. Import `detectWalletDevice` into `public/js/claim.js`.
2. Add `samsungWalletButton` in `public/claim.html`.
3. Keep existing Apple and Google functions unchanged.
4. Add a new `createSamsungWalletAddLink(resultOrTemplate)` path that calls only:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-add-link
```

5. Open the returned Samsung `addUrl`.
6. Add static tests to ensure:
   - Apple button still exists.
   - Google button still exists.
   - Samsung button exists.
   - Samsung Add URL is opened only from the Samsung path.
   - Samsung path does not expose Partner ID, private keys or certificates in browser code.

## Required Confirmation Text

Before implementing this shared claim-page change, confirm with:

```text
Ja, du darfst die Claim-Seite und Device Detection erweitern, damit iPhone Apple, Samsung Android Samsung Wallet und andere Android Google Wallet bekommen.
```
