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
| Fallback-Logik | `walletDesign.ts`, `generate-wallet-asset`, Editor-Warnungen |
| Plattform-Previews im Editor | `public/js/ui.js`, `public/styles.css`; nur per `showWalletInsights: true` im Editor |
| Claim-Seite ohne interne Warnungen | `public/js/claim.js` aktiviert `showWalletInsights` nicht |
| Server-seitige Asset-Generierung | `supabase/functions/generate-wallet-asset/index.ts` |
| Apple `.pkpass` nimmt generierte PNG-Fallbacks | `_shared/walletAssets.ts`, `appleWalletProvider.ts` fuer `stamp_grid`, `streak_badge`, `wallet_background`, `club_module_badges` |
| Google Issue/Save-Link nutzt vorhandene PNG-Fallbacks | `googleWalletProvider.ts` prueft `wallet-assets` serverseitig und setzt `heroImage`/`imageModulesData` nur fuer vorhandene Assets |
| Wallet-Updates bei Designaenderungen | `enqueue_wallet_update_after_template_design_change()` in `supabase/schema.sql` |
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
- Echte Google-Wallet-Karte auf Android installieren und Layout/Felder/QR/Update pruefen.
- Samsung Add-to-Wallet-Test mit echtem Samsung Partner Callback/Bearer durchlaufen.
- Ein echtes Template mit Stempel-/Streak-Asset ueber `generate-wallet-asset` generieren und in der Ziel-Wallet anzeigen.
- Eine echte Template-Designaenderung aus dem Editor speichern und beobachten, dass Apple/Google Queue-Jobs verarbeitet und Samsung Events vorbereitet werden.

## Ergebnisstand

Der Codepfad fuer Design-Parity ist implementiert, dokumentiert, statisch abgesichert, auf GitHub gepusht und in Supabase deployed. Die vollstaendige Zielerfuellung bleibt erst nach echter Apple-/Google-/Samsung-Endgeraeteabnahme beweisbar.
