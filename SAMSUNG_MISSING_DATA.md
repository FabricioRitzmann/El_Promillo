# Samsung Wallet Missing Data

Status: Samsung Wallet implementation paused.

Reason: The current Samsung data is not enough to create, update or validate Samsung Wallet cards safely. The available local "private key" file is a certificate signing request, not a private key. Samsung requires signed REST Authorization tokens and signed/encrypted card data tokens (`cdata`), so guessing would break the security model.

## Current Local Files

| File | Redacted finding | Result |
| --- | --- | --- |
| `env Samsung wallet.txt` | Contains `SAMSUNG_WALLET_PARTNER_ID`, `SAMSUNG_WALLET_CARD_ID`, `SAMSUNG_WALLET_CARD_TYPE`, `SAMSUNG_WALLET_TEMPLATE_ID`, `SAMSUNG_WALLET_ENV` | Useful, but incomplete |
| `samsung_wallet_private.key.txt` | File type is `PEM certificate request`; first line is `-----BEGIN CERTIFICATE REQUEST-----` | Wrong file for signing tokens |

Do not commit these local credential files.

## Required Samsung Values

| Exact value needed | Samsung menu / where to find it | Documentation link | Why it is needed | Required format | Where to put it |
| --- | --- | --- | --- | --- | --- |
| `SAMSUNG_WALLET_PRIVATE_KEY_PEM` | The private key generated when you created the CSR for Samsung Wallet onboarding. If it was lost, generate a new private key + CSR and register the new certificate in Samsung Wallet Partners Portal under Security / Certificate / CSR onboarding. | https://developer.samsung.com/wallet/securityauthentication/keycertificatelifecycle.html | Used by the backend to sign Samsung REST Authorization JWT/JWS and the outer JWS wrapper for `cdata`. | PEM private key, preferably PKCS#8: `-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----`. A CSR is not valid. | Supabase Edge Secret. For local checks, a non-versioned file such as `secrets/samsung-wallet-private-key.pem`. |
| `SAMSUNG_WALLET_CERTIFICATE_ID` | Samsung Wallet Partners Portal -> Security / Certificate details after CSR/certificate registration. | https://developer.samsung.com/wallet/securityauthentication/carddatatoken.html | Required in cdata JWS header as `certificateId`; also required in REST Authorization token header. | Portal-issued string, up to 64 chars. Use the exact value from Samsung. | Supabase Edge Secret. |
| `SAMSUNG_WALLET_PARTNER_CODE` | Samsung Wallet Partners Portal -> Wallet Card page -> Add to Wallet Script Guide. Confirm whether this is exactly the same as the existing `SAMSUNG_WALLET_PARTNER_ID`; do not assume. | https://developer.samsung.com/wallet/addtosamsungwallet/implementingatwbutton.html | Required by the Samsung web button as `partnercode`. Samsung auth docs also call this `partnerId`/partnerCode, but the button value must match the portal sample. | String from the portal script sample. | Supabase Edge Secret or server-provided public button config only if Samsung requires the browser attribute. |
| `SAMSUNG_WALLET_RD_CLICK_URL` | Samsung Wallet Partners Portal -> Wallet Card page -> Add to Wallet Script Guide / statistics beacon values. | https://developer.samsung.com/wallet/addtosamsungwallet/implementingatwbutton.html | Required button attribute `rdclickurl` / `RDClickUrl` for click tracking. | HTTPS URL from Samsung. | Supabase Edge Secret. |
| `SAMSUNG_WALLET_RD_IMPRESSION_URL` | Samsung Wallet Partners Portal -> Wallet Card page -> Add to Wallet Script Guide / statistics beacon values. | https://developer.samsung.com/wallet/addtosamsungwallet/implementingatwbutton.html | Required button attribute `rdimpressionurl` / `RDImpressionUrl` for impression tracking. | HTTPS URL from Samsung. | Supabase Edge Secret. |
| `SAMSUNG_WALLET_PARTNER_SERVER_URL` | Samsung Wallet Partners Portal -> Wallet Card -> Server Interaction / Partner Server API endpoint settings. | https://developer.samsung.com/wallet/api/server-interaction.html | Samsung calls this backend for `GET /cards/{cardId}/{refId}` and `POST /cards/{cardId}/{refId}`. It must be public HTTPS and match the future Supabase Edge Function route. | HTTPS URL. Recommended shape after implementation: `https://<PROJECT_REF>.supabase.co/functions/v1/samsung-wallet-server`. | Samsung Partner Portal and Supabase secret/config. |
| `SAMSUNG_WALLET_ADD_FLOW` | Samsung Wallet Partners Portal -> Wallet Card -> integration type / Add to Wallet setup. | https://developer.samsung.com/wallet/blog/en/2024/04/23/get-started-with-add-to-samsung-wallet | Needed to decide whether this project uses Data Fetch Link (`pdata`/refId) or Data Transmit Link (`cdata`). Because the project QR must contain only a secure token or wallet instance id, Data Fetch is the recommended fit, but the portal configuration must match. | `data_fetch` or `data_transmit`. | Supabase Edge Secret or server config. |
| `SAMSUNG_WALLET_AUTHORIZATION_VERIFICATION_INPUTS` | Samsung Wallet Partners Portal -> Security / API authentication settings. | https://developer.samsung.com/wallet/securityauthentication/restapiauthorizationtoken.html | Incoming Partner Server API requests include `Authorization: Bearer <JWT>`. The backend must know how to verify Samsung-signed requests and generate Samsung-bound outgoing auth tokens. | Portal/security artifact details, public certificate/key or documented verification inputs from Samsung. | Supabase Edge Secret/config, depending on artifact type. |
| `SAMSUNG_WALLET_COUNTRY_CODE_POLICY` | Samsung Wallet Partners Portal -> card service/country setup and Send Card State callback behavior. | https://developer.samsung.com/wallet/api/server-interaction.html | Samsung Server API update/cancel calls may require `cc2`; Send Card State sends `cc2` and may include a private callback domain. | Two-letter country code from callback or configured portal service, e.g. `CH`, `DE`, `KR`, `US`; store exact callback value per card when received. | Database field/table in future Samsung migration and optional secret/config default. |
| `SAMSUNG_WALLET_CARD_SCHEMA_CONFIRMATION` | Samsung Wallet Partners Portal -> Wallet Card -> Wallet API Spec / Card Template. | https://developer.samsung.com/wallet/api_new/getting/atwcards.html | Existing env has `SAMSUNG_WALLET_CARD_TYPE`, but the exact loyalty/generic payload fields and template expectations must match the card created in Samsung. | Exact Samsung card type and required fields from the portal/spec. | Documentation plus future Samsung provider mapping. |

## Why Implementation Must Stop Now

Samsung cdata is a JWS-wrapped JWE and is time sensitive. Samsung docs say it should be generated immediately after user action, and its JWS header requires `certificateId`, `partnerId` and `utc`. REST API Authorization tokens also require a `certificateId`, `partnerId`, request-bound method/path payload and Bearer transport.

The current files do not provide the private key or certificateId needed for those tokens. The repository also currently allows only Apple and Google in shared wallet platform constraints and shared notification flow, so adding Samsung would affect Apple/Google-adjacent code unless done in a carefully staged additive migration.

## Affected Files If Implementation Continues Later

These files would likely need additive changes after the missing data is available:

- `supabase/functions/_shared/samsungWalletProvider.ts` - new provider, no Apple/Google replacement.
- `supabase/functions/samsung-wallet-server/index.ts` - new Partner Server API endpoint for Get Card Data and Send Card State.
- `supabase/functions/samsung-wallet-add-link/index.ts` - new public/claim endpoint to create Samsung add flow.
- `supabase/functions/samsung-wallet-notification/index.ts` - new update/cancel notification endpoint if needed.
- `supabase/schema.sql` - additive Samsung tables and, only after confirmation, shared `wallet_platform` constraints.
- `supabase/config.toml` - JWT policy for new public Samsung callback/add endpoints.
- `public/claim.html` and `public/js/claim.js` - Samsung button and Samsung device detection after server side is ready.
- `supabase/functions/_shared/walletNotificationService.ts` - only after explicit confirmation, extend shared notification routing to Samsung.
- `scripts/*verify*` and docs - add Samsung contract checks.

## Safe Resume Checklist

Before implementation resumes, verify all of this without printing secrets:

1. The private key file starts with `-----BEGIN PRIVATE KEY-----` or another valid private-key PEM header, not `-----BEGIN CERTIFICATE REQUEST-----`.
2. `SAMSUNG_WALLET_CERTIFICATE_ID` exists and matches the certificate registered in the Samsung portal.
3. `SAMSUNG_WALLET_PARTNER_CODE` is confirmed from the Add to Wallet Script Guide.
4. RD click and impression URLs are present.
5. The Partner Server API public URL is registered in Samsung portal.
6. Data Fetch vs Data Transmit is confirmed.
7. The exact Samsung card type/schema for the loyalty card is confirmed.
8. The user confirms that shared Apple/Google-adjacent `wallet_platform` constraints may be extended to include Samsung, or approves a Samsung-only parallel table first.
