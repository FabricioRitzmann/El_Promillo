# Wallet Design Parity

Diese Datei beschreibt, wie die Editor-Kartenansicht auf Apple Wallet, Google Wallet und Samsung Wallet gemappt wird. Die Editor-Vorschau bleibt die Referenz, aber keine Wallet-Plattform kann beliebiges HTML/CSS pixelgenau uebernehmen.

## Quellen

- Apple Wallet Pass Design and Creation: https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html
- Google Wallet Classes and Objects: https://developers.google.com/wallet/generic/use-cases/create
- Samsung Wallet Cards API: https://developer.samsung.com/wallet/api/wallet-cards.html
- Samsung Wallet Server Interaction: https://developer.samsung.com/wallet/api/server-interaction.html

## Editor Design Elements

- Logo / Emblem
- Hintergrundfarbe
- Hintergrundbild / Textur
- Titel
- Untertitel
- Karten-ID
- Barcode / QR-Code
- Stempel
- Streak
- VIP-Level
- Guthaben
- Garderobenstatus
- Couponstatus
- Mitgliedschaftsstatus
- Push-Hinweistext
- Footer / Rueckseite / Details

## Implementierungsorte

| Bereich | Datei | Status |
|---|---|---|
| Zentrale Editor-Design-Abstraktion | `supabase/functions/_shared/walletDesign.ts` | Implementiert |
| Apple Mapping | `mapEditorDesignToApplePass` und `appleWalletProvider.ts` | Implementiert fuer Farben, Barcodeformat, Feldprioritaet, Assets/Fallback-Hinweise und generierte PNG-Fallbacks im `.pkpass` |
| Google Mapping | `mapEditorDesignToGoogleWalletObject` und `googleWalletProvider.ts` | Implementiert fuer Farben, Barcodeformat, Logo/Hero/Image-Module, Textmodule und vorhandene generierte PNG-Fallbacks im Issue/Save-Link |
| Samsung Mapping | `mapEditorDesignToSamsungWalletCard` und `samsungWalletProvider.ts` | Implementiert fuer Attribute, Farben, Barcodeformat, priorisierte Felder und vorhandene generierte PNG-Fallbacks im Partner-Server-GET |
| Komplexe Asset-Generierung | `generate-wallet-asset`, `_shared/walletAssets.ts`, `_shared/walletAssetRenderer.ts`, `_shared/walletAssetFallbacks.ts` | Implementiert fuer PNG-Fallbacks in `wallet-assets` mit gemeinsamem Storage-Pfadvertrag, Issue-Autogenerierung und Queue-Autogenerierung |
| Plattformwarnungen im Editor | `public/js/ui.js`, `public/styles.css` | Implementiert fuer sichtbare Info/Warning/Critical Hinweise |
| Plattformspezifische Editor-Previews | `public/js/ui.js`, `public/styles.css` | Implementiert fuer Apple/Google/Samsung Vorschau-Skizzen im Editor inklusive Barcodeformat-Beschriftung |
| Update Queue fuer Design-Aenderungen | `supabase/schema.sql`, `wallet_update_queue`, `samsung_wallet_events` | Implementiert fuer Apple/Google Queue-Jobs, automatische PNG-Fallbacks vor Updates und Samsung Update-Vorbereitung |

## Mapping-Matrix

| Editor-Element | Editor-Darstellung | Apple Wallet | Google Wallet | Samsung Wallet | 1:1 moeglich | Problem | Alternative | Implementierungsstatus |
|---|---|---|---|---|---|---|---|---|
| Logo / Business-Branding | Logo oben links, Businessname daneben | `logo.png`, `icon.png`, optional `thumbnail/strip` | `logo`, optional `heroImage`/`imageModulesData` | `logoImage`, `appLinkLogo`, `mainImg` je nach Template | Teilweise | Bildfelder sind pro Plattform fest platziert | Business-Logo bevorzugen, sonst Emblem/neutrales Asset | Implementiert |
| Emblem nach Initial-Scan | Demografie-/Gender-Emblem ersetzt Fallback | `thumbnail`/`strip` Asset, wenn oeffentliches Supabase Asset | `heroImage`/`imageModulesData` | `mainImg`/Logo-nahe Attribute, wenn Template erlaubt | Teilweise | Wallets erlauben keine freie Overlay-Position | Emblem als Plattform-Bildfeld oder generiertes kombiniertes Asset | Implementiert |
| Hintergrundfarbe | Editor CSS Variable `--card-bg` | `backgroundColor` | `hexBackgroundColor` fuer passende Object-Typen | `bgColor` | Teilweise | Rendering/Contrast-Regeln variieren | Naechste gueltige Hex-Farbe, Textfarbe separat pruefen | Implementiert |
| Textfarbe | Editor CSS Variable `--card-fg` | `foregroundColor`, `labelColor` | Eingeschraenkt, nicht fuer alle Textbereiche | `fontColor` hell/dunkel statt freier Farbe | Nein | Google/Samsung kontrollieren viele Textfarben selbst | Kontraststarke Systemfarbe bzw. hell/dunkel Mapping | Implementiert |
| Hintergrundbild / Textur | Event-Bild als CSS Background | Je nach Pass-Style `strip`/`background`/`thumbnail`, Apple Watch eingeschraenkt | `heroImage` oder `imageModulesData` | `mainImg` oder Template-spezifisches Bildfeld | Nein | Kein freies CSS Background Layering | Bild als Hero/Strip/Main-Image, Farbe als Fallback | Implementiert; Apple, Google und Samsung nutzen vorhandene `wallet_background` PNGs |
| Standort / Beacon | Business-, Event- oder Garderobenstandort aus Template-/Business-Daten | `locations` und `beacons` im `pass.json` | Kein identisches Feld im aktuellen Object-Mapping | Partner-Template-/Callback-abhaengig, kein identisches Feld im aktuellen Mapping | Teilweise | Standortrelevanz ist plattformspezifisch und nicht dieselbe sichtbare Kartenflaeche | Apple nativ setzen; Google/Samsung als Details, Push-Logik oder Partner-Template-Konfiguration fuehren | Implementiert fuer Apple, dokumentiert/warnt fuer Google und Samsung |
| Titel | Grosse Editor-Typo | Native Felder, Pass-Style Layout | `cardTitle`/`header` | `title` | Teilweise | Schriftart und Position nicht frei | Systemschrift oder dekorativer Titel als Bild | Implementiert |
| Untertitel/Beschreibung | Beschreibung unter Titel | Secondary/back fields | `subheader`, Textmodule | `subtitle1`, `noticeDesc` | Teilweise | Laenge und Umbruch variieren | Kurze Vorderseite, volle Beschreibung in Details | Implementiert |
| Karten-ID | Footer-Code | Sichtbares Feld und Barcode-AltText | `accountId`/Textmodul/Barcode | Barcode-Wert und Details | Ja | Layoutposition ist unterschiedlich | Hoechste Feldprioritaet, auch in Details | Implementiert |
| Barcode / QR-Code | Barcodewert aus Template/Card/Metadaten oder Karten-ID-Fallback; optionales Template-Format `qr`, `aztec`, `pdf417` oder `code128`; Editor-Plattformvorschau zeigt normalisierten Wert und Format | `PKBarcodeFormatQR`, `PKBarcodeFormatAztec`, `PKBarcodeFormatPDF417`, `PKBarcodeFormatCode128` | `QR_CODE`, `AZTEC`, `PDF_417`, `CODE_128` | Samsung Barcode-Attribute `serialType`/`ptFormat`/`ptSubFormat`, Template-abhaengig | Teilweise | Plattformformatnamen unterscheiden sich; Samsung-Templates koennen einzelne Formate begrenzen | QR bleibt Default; Editor-/Template-Wert und -Format werden serverseitig und in der Editor-Vorschau normalisiert; Samsung bekommt bei Nicht-QR einen UI-Hinweis | Implementiert |
| Stempel | Visuelles Raster mit Icon | Kein natives Raster | Kein natives Raster | Kein natives Raster | Nein | Freies Grid gibt es nicht | Textfeld `x/y`; optional `stamp_grid` Asset | Text und PNG-Asset-Generator implementiert |
| Streak | Icon + Zaehler/Ziel | Feld oder Bild | Textmodul/Image-Modul | Attribut/Text | Nein | Kombiniertes Editor-Layout nicht nativ | Streak als Text, optional `streak_badge` Asset | Text und PNG-Asset-Generator implementiert |
| VIP-Level | Feature-Reihe | Vorderseitenfeld nach Prioritaet | Loyalty/Textmodul | `level`/Details | Teilweise | Feldnamen/Positionen unterscheiden sich | VIP vorne, Rest in Details | Implementiert |
| Guthaben | Feature-Reihe mit Waehrung | Vorderseitenfeld oder Back Field | `giftCardObject` fuer `balance_card`, sonst Loyalty/Generic Textmodul bei Club-/Modulkarten | `amount`/`balance` | Teilweise | Gift-Card-Layout bleibt Google-Template-gebunden; Clubkarten koennen nicht gleichzeitig Gift Card und Loyalty sein | Echte Google-Gift-Card-Payload fuer Guthabenkarten, Text-/Detailfeld fuer kombinierte Karten | Implementiert |
| Garderobe | Aktiv/Bereit | Vorderseite oder Rueckseite | Textmodul | Notice/Details | Teilweise | Kein natives Cloakroom-Feld | Status als priorisiertes Textfeld | Implementiert |
| Couponstatus | Titel + Bereit/Eingeloest | `coupon` Pass-Style oder Feld | `offerObject` plus Textmodul | `coupon`/loyalty Attribute je nach Samsung Card | Teilweise | Validierungs- und Fine-Print-Felder variieren | Couponstatus vorne, Bedingungen in Details | Implementiert |
| Mitgliedschaft | Status/Nummer/Ablauf | Vorderseite + Rueckseite | Loyalty/Textmodule | Loyalty/Membership-Attribute, abhaengig vom Template | Teilweise | Samsung Membership ist partner-/templateabhaengig | Nummer/Status vorne, Ablauf in Details | Implementiert |
| Clubkarte Module | VIP, Guthaben, Garderobe, Coupon, Mitgliedschaft optional | Priorisierte Felder, Ueberlauf auf Rueckseite, optional `club_module_badges` PNG | Loyalty/Generic Textmodule plus vorhandenes `club_module_badges` Bildmodul | Begrenzte Attribute + Details plus vorhandenes `club_module_badges` als `mainImg` | Nein | Zu viele Module fuer feste Wallet-Front | Prioritaet: ID, VIP, Guthaben, Mitgliedschaft, Coupon, Garderobe, Details; Badge-Asset als Fallback | Implementiert |
| Push-Hinweistext | Editor Notification/Message | Pass Web Service + APNS Update, latestMessage Feld | `TEXT_AND_NOTIFY` oder Object Patch | Samsung Server API Update Notification vorbereitet | Teilweise | Push-Mechaniken sind plattformspezifisch | Message separat behandeln, sichtbare Felder patchen | Bestehende Logik bleibt bestehen |
| Footer / Rueckseite / Details | Footer-Code und Zusatzinfos | `backFields` | `textModulesData` | `noticeDesc` und Attribute | Teilweise | Kein gemeinsames Rueckseitenmodell | Details pro Plattform in native Detailfelder verschieben | Implementiert |
| Custom Font | Web/CSS moeglich | Nicht als echte Pass-Schrift steuerbar | Nicht steuerbar | Templateabhaengig | Nein | Wallets rendern native Templates | Systemschrift oder serverseitig gerendertes Bild | Warnung implementiert; dekoratives PNG-Asset vorbereitet |

## Template-Abdeckung

| Template | Apple Ziel | Google Ziel | Samsung Ziel | Feldprioritaet |
|---|---|---|---|---|
| `club_card` | `storeCard` Mapping, aktuell in Provider dynamisch | Loyalty/Generic-nahe Object-Felder | Loyalty-Attribute | ID, VIP, Guthaben, Mitgliedschaft, Coupon, Garderobe |
| `stamp_card` | `storeCard` mit Stempelfeld | Loyalty Object/Textmodule | Loyalty-Attribute | ID, Titel, Stempel, Belohnung |
| `streak_card` | `storeCard` mit Streakfeld | Loyalty Object/Textmodule | Loyalty-Attribute | ID, Titel, Streak, Belohnung |
| `vip_card` | `storeCard` | Loyalty Object | Loyalty-Attribute | ID, VIP, Titel, Details |
| `balance_card` | `storeCard` | `giftCardObject` mit `cardNumber` und `balance` | Loyalty-Attribute | ID, Guthaben, Titel |
| `cloakroom_card` | `generic` | Generic/Textmodule | Generic/Loyalty Attribute | ID, Garderobe, Titel |
| `coupon_card` | `coupon` | `offerObject` | Coupon/Loyalty Attribute | ID, Couponstatus, Titel |
| `membership_card` | `storeCard` | `loyaltyObject` | Loyalty/Membership-nahe Attribute | ID, Mitgliedschaft, VIP |
| `event_card` | `eventTicket` | `eventTicketObject` | Ticket/Generic Attribute | ID, Einlass, Eventdaten |
| `generic_card` | `generic` | `genericObject` | Generic Attribute | ID, Status, Titel |

## Fallback-Vertrag

| Fall | Verhalten |
|---|---|
| Custom Font | Native Systemschrift; dekorative Schrift nur als serverseitig generiertes Bild |
| Komplexes Stempelraster | Textfeld `x/y`; optional `generate-wallet-asset` mit `asset_type=stamp_grid` |
| Komplexer Hintergrund | Gueltige Hintergrundfarbe plus Hero/Strip/Main-Image |
| Clubkarten-Modul-Badges | Mehrere aktive Clubmodule bleiben native Felder/Details; optionales `club_module_badges` PNG fuer Apple-Bundle, Google-ImageModule und Samsung-`mainImg` |
| Zu viele Felder | Priorisierte Vorderseite, Rest in Apple `backFields`, Google `textModulesData`, Samsung `noticeDesc` |
| Nicht unterstuetztes Feature | Als Text/Details darstellen und Warnung ausgeben |
| Nicht unterstuetztes Barcodeformat | Auf QR zurueckfallen oder Samsung Partner-Template passend konfigurieren |
| Ungueltige Farbe | Fallback `#fffdf9`/`#8b4f2f` oder Samsung hell/dunkel |
| Fehlendes Emblem | Business-Logo oder neutrales El-Promillo-Asset |
| Nicht oeffentliches Bild | Wallet-Bildfeld auslassen oder serverseitig in Supabase Storage erzeugen |

## Security-Grenzen

- Keine Apple-, Google- oder Samsung-Secrets im Browser.
- Editor erzeugt nur Template-/Design-Konfiguration.
- Wallet-Erstellung, Updates, Signierung und Plattform-API-Aufrufe bleiben in Supabase Edge Functions bzw. sicherem Backend-Code.
- Assets fuer echte Wallets muessen oeffentlich per HTTPS erreichbar oder kontrolliert signiert sein.
- Business-Isolation bleibt ueber bestehende `owner_id`/`business_id` Filter und RLS-Vertraege erhalten.
