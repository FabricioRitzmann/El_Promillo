# Wallet Design Parity Checklist

Diese Checkliste dokumentiert den aktuellen Nachweisstand fuer das Wallet-Design-Parity-Ziel. Sie ersetzt keine externe Endgeraete-Abnahme in Apple Wallet, Google Wallet und Samsung Wallet, zeigt aber, welche Anforderungen im Repository und im Supabase-Projekt technisch abgesichert sind.

## Abgeschlossen Im Repository

| Anforderung | Nachweis |
|---|---|
| Editor-Kartenanalyse | `public/js/ui.js`, `public/js/templateFeatures.js`, `docs/wallet-design-parity.md` |
| Apple Wallet Mapping | `supabase/functions/_shared/walletDesign.ts`, `supabase/functions/_shared/appleWalletProvider.ts` |
| Google Wallet Mapping | `supabase/functions/_shared/walletDesign.ts`, `supabase/functions/_shared/googleWalletProvider.ts` |
| Samsung Wallet Mapping | `supabase/functions/_shared/walletDesign.ts`, `supabase/functions/_shared/samsungWalletProvider.ts` |
| Mapping-Matrix | `docs/wallet-design-parity.md` |
| Feature-Limitations pro Wallet | `docs/wallet-feature-limitations.md` |
| Zentrale Design-Abstraktion | `EditorCardDesign` in `supabase/functions/_shared/walletDesign.ts` |
| Mapping-Funktionen | `mapEditorDesignToApplePass`, `mapEditorDesignToGoogleWalletObject`, `mapEditorDesignToSamsungWalletCard` |
| Barcodeformat-Parity | `walletDesign.ts` und die Editor-Plattformvorschau normalisieren `qr`, `aztec`, `pdf417`, `code128`; die Provider mappen sie auf Apple-, Google- und Samsung-Formatnamen |
| Fallback-Logik | `walletDesign.ts`, `generate-wallet-asset`, Editor-Warnungen |
| Plattform-Previews im Editor | `public/js/ui.js`, `public/styles.css`; nur per `showWalletInsights: true` im Editor |
| Claim-Seite ohne interne Warnungen | `public/js/claim.js` aktiviert `showWalletInsights` nicht |
| Server-seitige Asset-Generierung | `supabase/functions/generate-wallet-asset/index.ts` |
| Gemeinsamer Asset-Renderer | `_shared/walletAssetRenderer.ts` wird von `generate-wallet-asset`, Initial-Issue und der Update Queue genutzt |
| Automatische Asset-Fallbacks | `_shared/walletAssetFallbacks.ts` erzeugt PNG-Fallbacks fuer Apple-Issue, Apple-Claim, manuelle Apple-Pass-/Push-Updates, Google-Issue/Save-Link, Google-Refresh-/Message-Fallbacks, Samsung Partner-Server und Queue-Updates |
| Provider Registry bleibt auf derselben Pipeline | `walletProviderRegistry.ts` erzeugt bei serverseitigem `supabaseAdmin` ebenfalls PNG-Fallbacks, bevor Apple/Google/Samsung-Provider-Payloads entstehen |
| Apple `.pkpass` nimmt generierte PNG-Fallbacks | `_shared/walletAssets.ts`, `appleWalletProvider.ts` fuer `stamp_grid`, `streak_badge`, `wallet_background`, `club_module_badges` |
| Google Issue/Save-Link nutzt die zentrale Design- und Asset-Pipeline | `issue-google-wallet-pass` und `google-wallet-save-link` erzeugen benoetigte PNG-Fallbacks serverseitig und verwenden `googleWalletProvider.ts` fuer `heroImage`/`imageModulesData` |
| Google Guthabenkarte nutzt Gift Card Mapping | `balance_card` wird als `giftCardObject` mit `giftCardClasses`/`giftCardObjects`, `cardNumber` und Google-`Money`-`balance` erzeugt |
| Manuelle Apple/Google Wallet Updates nutzen dieselbe Asset-Fallback-Pipeline | `update-apple-pass`, `send-apple-wallet-update`, `update-google-wallet-pass` und `send-google-wallet-message` erzeugen benoetigte PNG-Fallbacks vor neu signierten Pass-Versionen bzw. Google Object-Patches |
| Samsung Partner-Server nutzt vorhandene PNG-Fallbacks | `samsungWalletProvider.ts` prueft `wallet-assets` serverseitig und setzt `mainImg` nur fuer vorhandene Assets |
| Wallet-Updates bei Designaenderungen | `enqueue_wallet_update_after_template_design_change()` in `supabase/schema.sql`; `process-wallet-update-queue` erzeugt benoetigte PNG-Fallbacks vor Apple-/Google-Updates |
| Clubkarten-Priorisierung | `walletDesign.ts`, Matrix in `docs/wallet-design-parity.md` |
| Keine Wallet-Secrets im Frontend | `scripts/verify-browser-secret-boundary.js`, `scripts/verify-wallet-design-parity.js` |
| Business-Isolation fuer Assets | `generate-wallet-asset` prueft `owner_id` und `business_id` |
| Bestehende Flows statisch abgesichert | `pnpm run check` |

## Remote Nachweise

| Bereich | Nachweis |
|---|---|
| Supabase Edge Functions | `claim-apple-pass`, Apple/Google/Samsung Wallet Functions und `generate-wallet-asset` wurden deployed |
| Supabase Schema | `supabase/schema.sql` wurde remote angewendet |
| Template-Design-Trigger | Remote bestaetigt `enqueue_wallet_update_after_template_design_change` und `enqueue_wallet_update_jobs_after_template_update` |
| Samsung Update-Vorbereitung | Remote Function enthaelt `template_design_update_prepared` |
| Remote-Schema | `node scripts/wallet-remote-schema-check.js --strict` meldet OK 18, WARN 0, FAIL 0 |

## Verifizierte Commands

```bash
node scripts/verify-edge-typescript-syntax.js
node scripts/verify-edge-function-imports.js
node scripts/verify-supabase-schema-sanity.js
node scripts/verify-wallet-design-parity.js
node scripts/wallet-remote-schema-check.js --strict
pnpm run build
pnpm run check
```

Hinweis: Die lokale Codex-Runtime nutzt Node 24, waehrend `package.json` Node 20 erwartet. Die Checks laufen trotz Engine-Warnung erfolgreich.

## Externe Abnahme Noch Noetig

- Echte Apple-Wallet-Karte auf iPhone installieren und Layout/Felder/QR/Update pruefen.
- Echte Apple-Wallet-Karte mit QR, Aztec, PDF417 und Code128 testen, falls diese Formate im Business-Setup genutzt werden.
- Echte Google-Wallet-Karte auf Android installieren und Layout/Felder/QR/Update pruefen.
- Echte Google-Wallet-Karte mit QR, Aztec, PDF417 und Code128 testen, falls diese Formate im Business-Setup genutzt werden.
- Samsung Add-to-Wallet-Test mit echtem Samsung Partner Callback/Bearer durchlaufen.
- Samsung Partner-Template fuer alle genutzten Barcodeformate bestaetigen; QR bleibt der sichere Default.
- Ein echtes Template mit Stempel-/Streak-Asset ueber `generate-wallet-asset` generieren und in der Ziel-Wallet anzeigen.
- Eine echte Template-Designaenderung aus dem Editor speichern und beobachten, dass Apple/Google Queue-Jobs verarbeitet und Samsung Events vorbereitet werden.

## Ergebnisstand

Der Codepfad fuer Design-Parity ist implementiert, dokumentiert, statisch abgesichert, auf GitHub gepusht und in Supabase deployed. Die vollstaendige Zielerfuellung bleibt erst nach echter Apple-/Google-/Samsung-Endgeraeteabnahme beweisbar.
