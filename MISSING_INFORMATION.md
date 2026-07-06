# Missing Information - Samsung Wallet Integration

Status: Implementation stopped by project rule 4.

The Samsung Wallet integration cannot be implemented safely yet. The current repository has enough Apple and Google Wallet structure to identify the integration points, but the Samsung runtime credentials and a few portal decisions are incomplete or ambiguous. No Apple Wallet, Google Wallet, Supabase schema, Edge Function or frontend logic has been changed for Samsung.

## What Is Missing

See `SAMSUNG_MISSING_DATA.md` for the exact Samsung values, portal locations, formats and documentation links.

Summary of blockers:

| Missing item | Why it is required | Required format | File or secret to add |
| --- | --- | --- | --- |
| Real Samsung partner private key | Signs Samsung REST Authorization JWT/JWS and cdata JWS. The local `samsung_wallet_private.key.txt` is a CSR, not a private key. | PEM private key, preferably PKCS#8: `-----BEGIN PRIVATE KEY-----` | Supabase secret `SAMSUNG_WALLET_PRIVATE_KEY_PEM` or non-versioned local secret file |
| Samsung `certificateId` | Required in Samsung cdata and REST Authorization token headers. | String from Samsung onboarding certificate registration | Supabase secret `SAMSUNG_WALLET_CERTIFICATE_ID` |
| Samsung `partnerCode` confirmation | The web Add to Wallet button requires `partnercode`; docs also map `partnerId` to partnerCode, but the exact portal value must be confirmed. | Partner Portal string | Supabase secret `SAMSUNG_WALLET_PARTNER_CODE` |
| Samsung RD click/impression URLs | Required by Samsung web button script for click/impression logging. | HTTPS URLs from Partner Portal Wallet Card page | Supabase secrets `SAMSUNG_WALLET_RD_CLICK_URL`, `SAMSUNG_WALLET_RD_IMPRESSION_URL` |
| Samsung partner server URL registration | Samsung must call our Partner Server API for Get Card Data and Send Card State. | Public HTTPS Supabase Edge Function base/path registered in Partner Portal | Samsung Partner Portal plus future Edge Function config |
| Add flow decision | The prompt requires QR codes to contain only `wallet_instance_id` or secure token. Samsung supports Data Transmit and Data Fetch; Data Fetch is safer here, but the configured portal flow must be confirmed. | `data_fetch` or `data_transmit` | Supabase secret/config `SAMSUNG_WALLET_ADD_FLOW` |
| Server API authorization verification details | Incoming Samsung callbacks and outgoing Samsung Server API requests require Bearer JWT/JWS validation/generation bound to method/path. | Samsung portal/security artifact details | Supabase secrets and future Samsung Edge Function code |

## Current Evidence

Local files found:

- `env Samsung wallet.txt` contains only these keys: `SAMSUNG_WALLET_PARTNER_ID`, `SAMSUNG_WALLET_CARD_ID`, `SAMSUNG_WALLET_CARD_TYPE`, `SAMSUNG_WALLET_TEMPLATE_ID`, `SAMSUNG_WALLET_ENV`.
- `samsung_wallet_private.key.txt` has file type `PEM certificate request` and starts with `-----BEGIN CERTIFICATE REQUEST-----`. This is not a private key and cannot be used to sign Samsung tokens.

Existing architecture found:

- Apple provider: `supabase/functions/_shared/appleWalletProvider.ts`
- Google provider: `supabase/functions/_shared/googleWalletProvider.ts`
- Shared notification and queue service: `supabase/functions/_shared/walletNotificationService.ts`
- Claim page/device routing: `public/js/claim.js`
- Wallet platform constraints and Apple/Google tables: `supabase/schema.sql`

Important Apple/Google impact:

- Adding `samsung` to the existing shared `wallet_platform` flow would touch constraints, triggers, target filters, notification recipients, queue processing, claim routing and frontend platform detection.
- A direct implementation now would therefore affect shared Apple/Google-adjacent paths. Project rule 3 requires stopping and explaining the affected files before such changes.

Safer alternative after the missing Samsung data is available:

1. Add Samsung-specific Edge Functions and shared provider files first, without changing Apple or Google provider internals.
2. Add Samsung tables or narrowly scoped Samsung columns in an additive migration.
3. Only after explicit confirmation, extend shared `wallet_platform` constraints and notification target filters to include Samsung.
4. Add claim UI/device detection last, once server-side Samsung token generation is verified.

## Where To Get The Missing Data

Use the Samsung Wallet Partners Portal:

- Wallet Card page / Add to Wallet Script Guide: card ID, partnerCode, RD click URL, RD impression URL, integration sample.
- Security / Certificate / CSR onboarding area: certificateId and the private key that matches the CSR.
- Wallet Card API or Server Interaction settings: Partner Server API endpoint / callback URL configuration.

Official Samsung documentation used:

- Add to Wallet button: https://developer.samsung.com/wallet/addtosamsungwallet/implementingatwbutton.html
- Server Interaction: https://developer.samsung.com/wallet/api/server-interaction.html
- API Guidelines: https://developer.samsung.com/wallet/api_new/addto/guidelines.html
- REST API Authorization Token: https://developer.samsung.com/wallet/securityauthentication/restapiauthorizationtoken.html
- Card Data Token: https://developer.samsung.com/wallet/securityauthentication/carddatatoken.html
- Key & Certificate Lifecycle: https://developer.samsung.com/wallet/securityauthentication/keycertificatelifecycle.html

## What To Do Next

1. Open `SAMSUNG_MISSING_DATA.md`.
2. Collect each missing value from the Samsung Wallet Partners Portal.
3. Replace the CSR-only local file with the real private key or provide the private key as a Supabase secret.
4. Keep all Samsung credentials out of Git.
5. Resume implementation only after these values are present and verified.
