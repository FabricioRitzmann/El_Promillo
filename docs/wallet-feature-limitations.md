# Wallet Feature Limitations

Diese Datei listet die bekannten Abweichungen zwischen Editor-Vorschau und den echten Wallet-Plattformen. Sie ist die fachliche Grundlage fuer Editor-Warnungen und QA-Checks.

## Apple Wallet

### Nicht 1:1 moeglich

- Pixelgenaues HTML/CSS-Layout aus der Editor-Karte.
- Freie Positionierung von Titeln, Icons, Feature-Reihen und Footer.
- Echte Custom Fonts fuer native Pass-Felder.
- Komplexes Stempelraster als natives Feld.
- Komplexe Streak-Anzeige mit Icon, Ziel und dekorativem Layout.
- Beliebig viele Vorderseitenfelder ohne Umbruch-/Ausblendrisiko.
- Strip-/Thumbnail-/Background-Bilder sind pass-style- und geraeteabhaengig; Apple Watch zeigt nicht alle Bildtypen gleich.

### Alternative Umsetzung

- `mapEditorDesignToApplePass` priorisiert Karten-ID, Titel, VIP, Guthaben, Mitgliedschaft, Coupon, Garderobe und Stempel/Streak.
- Ueberlauf geht in `backFields`.
- Farben werden auf `backgroundColor`, `foregroundColor` und `labelColor` gemappt.
- Barcode wird aus Editor-/Template-Konfiguration normalisiert; QR ist Default, Aztec/PDF417/Code128 werden als `PKBarcodeFormatAztec`, `PKBarcodeFormatPDF417` oder `PKBarcodeFormatCode128` gesetzt.
- Stempel/Streak koennen zusaetzlich ueber `generate-wallet-asset` als Bild vorbereitet werden.
- Bereits erzeugte Apple-Fallbacks werden ueber `_shared/walletAssets.ts` deterministisch gefunden und als `strip.png`, `thumbnail.png` oder `background.png` in das `.pkpass` aufgenommen.
- Business-Logo/Emblem werden als Apple-kompatible Assets genutzt, wenn die URL sicher und oeffentlich ist und die geladenen Bytes echte PNGs sind.
- Wenn ein Logo als JPEG/WebP oder ohne klaren PNG-Pfad hochgeladen wurde, erzeugt Apple serverseitig ein `decorative_title` PNG als Fallback, statt Fremdbytes unter `.png` zu verpacken.

## Google Wallet

### Nicht 1:1 moeglich

- Freies Editor-Layout mit eigener CSS-Struktur.
- Custom Fonts fuer native Textfelder.
- Exakte Position von Feature-Reihen.
- Native Stempelraster oder komplexe Badge-Kompositionen.
- Vollstaendige Farbkontrolle ueber alle Text- und Hintergrundbereiche.
- Nicht-HTTPS- oder private Bilder in Wallet-Objekten.
- Push/Message-Verhalten ist an Google Wallet API-Mechaniken und Limits gebunden.

### Alternative Umsetzung

- `mapEditorDesignToGoogleWalletObject` erzeugt Google-konforme Object-Daten.
- Logo/Emblem gehen in `logo`, `heroImage` oder `imageModulesData`.
- Reine Guthabenkarten (`balance_card`) gehen als `giftCardObject` mit `cardNumber` und Google-`Money`-`balance`; kombinierte Clubkarten behalten Guthaben als `textModulesData`, weil ein Google Object nicht gleichzeitig Gift Card und Loyalty sein kann.
- Status, Karten-ID, VIP, Coupon, Mitgliedschaft und Garderobe gehen in `textModulesData`.
- Barcode wird aus Editor-/Template-Konfiguration normalisiert; QR ist Default, Aztec/PDF417/Code128 werden als `AZTEC`, `PDF_417` oder `CODE_128` gesetzt.
- Stempel/Streak werden als Textmodule gesetzt und koennen spaeter als `imageModulesData` aus serverseitigen Assets ergaenzt werden.
- Im Issue- und öffentlichen Claim-Save-Link-Pfad erzeugen die Edge Functions benoetigte PNG-Fallbacks serverseitig und nutzen danach `googleWalletProvider.ts`, der nur existierende HTTPS-PNGs als `heroImage`/`imageModulesData` setzt.
- Der passendste vorhandene Object-Type wird genutzt: Generic, Loyalty, Offer oder Event Ticket.

## Samsung Wallet

### Nicht 1:1 moeglich

- Exaktes Editor-Layout, freie Feldposition und CSS-Effekte.
- Einheitliches Verhalten ueber alle Samsung Card Templates hinweg.
- Freie Schriftarten und vollstaendige Farbkontrolle.
- Alle Apple-/Google-Felder haben kein identisches Samsung-Gegenstueck.
- Anzahl und Bedeutung von Bildfeldern haengen vom Partner-Template und Card Type ab.
- Samsung braucht korrekte Partner-, Zertifikat-, Card-ID-, Server- und Callback-Konfiguration.

### Alternative Umsetzung

- `mapEditorDesignToSamsungWalletCard` priorisiert Titel, Provider, Barcode, Farbe, Betrag/Status, Level und Details.
- QR ist Samsung-Default; Aztec/PDF417/Code128 werden als Samsung Barcode-Attribute gemappt, bleiben aber vom Partner-Template abhaengig.
- Wichtige Felder werden in Attribute wie `amount`, `balance`, `level`, `noticeDesc` und Barcode-Felder gemappt.
- Nicht passende Features landen in `noticeDesc`.
- Logo/App-Link-Assets bleiben ueber die bestehende Public-HTTPS-Pruefung abgesichert.
- Im Samsung Partner-Server-GET prueft `samsungWalletProvider.ts` vorhandene PNGs im Bucket `wallet-assets` und nutzt sie nur dann als `mainImg`, wenn sie wirklich existieren.
- Samsung-spezifische Partner- und Bearer-Validierung bleibt in `samsungWalletProvider.ts`.

## Unterschiede Zwischen Plattformen

### Funktioniert Nur Bei Apple

- Pass Web Service mit Apple-spezifischem `authenticationToken`/`webServiceURL`.
- Apple Pass Bundle mit `pass.json`, Manifest und Signatur.
- Apple-spezifische `backFields` als Rueckseitenmodell.
- Native Pass-Relevanz ueber `locations` und `beacons`.

### Funktioniert Nur Bei Google

- Google Wallet Classes/Objects als getrennte API-Modelle.
- `TEXT_AND_NOTIFY` Message-Pfad mit Google Wallet API.
- `imageModulesData` als generisches Bildmodul.

### Funktioniert Nur Bei Samsung

- Data-Fetch-Link mit `pdata=refId`.
- Samsung Partner Server Callback fuer Card Data.
- Samsung-spezifische Partner Authorization Pruefung.

### Funktioniert Bei Apple + Google, Aber Nicht Samsung

- Feineres Feldmodell fuer mehrere Front-/Detailfelder.
- Direktere Nutzung von plattformspezifischen Webservice/Object-Patches fuer sichtbare Updates.
- Mehr etablierte QA- und Testpfade im bestehenden Repo.

### Funktioniert Bei Google + Samsung, Aber Nicht Apple

- API-seitige Object/Card Updates ohne neues signiertes `.pkpass` Bundle.
- Bildmodule/Template-Attribute, die eher objektbasiert als bundlebasiert sind.

### Funktioniert Bei Apple + Samsung, Aber Nicht Google

- Stark pass-/card-template-getriebene Darstellung mit festem Partner-/Pass-Typ.
- Bestimmte Barcode-Serialisierungen sind plattformintern anders modelliert als Google `barcode.type`; Samsung kann je nach Partner-Template auf QR begrenzt sein.

## Clubkarte

Die Clubkarte kombiniert optionale Module. Nur aktivierte Module duerfen sichtbar gemappt werden.

Prioritaet:

1. Karten-ID
2. VIP-Level
3. Guthaben
4. Mitgliedschaftsstatus
5. Couponstatus
6. Garderobenstatus
7. Zusatzdetails

Wenn zu viele Module aktiv sind:

- Apple zeigt priorisierte Felder vorne und Details in `backFields`.
- Google zeigt priorisierte Felder als Loyalty/Generic-Daten und weitere Details in `textModulesData`.
- Samsung zeigt wenige Attribute vorne und den Rest in `noticeDesc`.

## Asset-Fallbacks

`walletDesign.ts` meldet aktuell folgende serverseitige Asset-Bedarfe:

- `stamp_grid` fuer komplexe Stempelraster.
- `streak_badge` fuer dekorative Streak-Anzeigen.
- `wallet_background` fuer komplexe Hintergruende/Texturen.
- `combined_emblem` fuer eine gemeinsame Branding-/Titel-/Emblemflaeche bei begrenzten Wallet-Bildslots.
- `decorative_title` fuer Editor-Titel, die nicht als native Wallet-Schrift steuerbar sind, und als Apple-PNG-Fallback fuer Logos mit unsicherem Bildformat.
- `club_module_badges` fuer mehrere aktive Clubkarten-Module.

Die sichere Edge Function `generate-wallet-asset` ist implementiert. Sie laeuft serverseitig, verlangt Betreiber-Login, prueft `owner_id` und `business_id`, rendert PNG-Fallbacks und speichert sie im oeffentlichen Bucket `wallet-assets`. Der gemeinsame Helper `_shared/walletAssets.ts` legt denselben Storage-Pfad fuer Generator und Wallet-Provider fest.

Initiale Wallet-Erstellungen und manuelle sichtbare Updates erzeugen benoetigte Fallback-PNGs ebenfalls serverseitig: `issue-apple-pass`, `claim-apple-pass`, `update-apple-pass`, `send-apple-wallet-update`, `issue-google-wallet-pass`, `google-wallet-save-link`, `update-google-wallet-pass`, `send-google-wallet-message` und der Samsung Partner-Server-GET nutzen `_shared/walletAssetFallbacks.ts`, bevor die jeweilige Wallet-Payload gebaut wird.

```json
{
  "card_instance_id": "...",
  "asset_type": "stamp_grid",
  "wallet_platform": "apple"
}
```

Antwort:

```json
{
  "asset_url": "...",
  "asset_path": "...",
  "width": 600,
  "height": 200
}
```

## Update Queue

Bestehende Designaenderungen sollen ueber `wallet_update_queue` fan-out-faehig verarbeitet werden.

Geplante Update-Typen:

- `design_changed`
- `asset_changed`
- `emblem_changed`
- `field_changed`
- `feature_changed`
- `barcode_changed`

Aktueller Status:

- Queue-Tabelle und generische Update-Verarbeitung existieren.
- Initial-Scan-Emblemwechsel reihen Apple-/Google-`card_instances` als `emblem_changed` ein; das Payload enthaelt vorheriges und neues Emblem fuer Audit und Provider-Rebuild.
- Template-Designaenderungen reihen Apple-/Google-`card_instances` ueber den SQL-Trigger `enqueue_wallet_update_after_template_design_change()` ein.
- Reine Barcodewert- oder Barcodeformat-Aenderungen in `settings` werden dabei als `barcode_changed` klassifiziert; andere `settings`-Aenderungen bleiben `asset_changed`.
- `process-wallet-update-queue` erzeugt benoetigte PNG-Fallbacks automatisch serverseitig, bevor Apple neu signiert oder Google ein Object patcht.
- Manuelle Apple-Pass-/Push-Updates und Google-Object-/Message-Fallback-Updates erzeugen benoetigte PNG-Fallbacks ebenfalls nach Idempotency-/Limitpruefung und vor dem Provider-Update.
- Samsung Wallet Instanzen werden im selben Trigger ueber `samsung_wallet_events.event_type=template_design_update_prepared` vorbereitet; die Ausfuehrung laeuft weiterhin ueber den separaten Samsung Data-Fetch-/Update-Pfad.

## Editor-Warnungen

Warn-Level:

- Info: leichte Abweichung, z. B. Systemschrift statt Web-Font.
- Warning: sichtbare Abweichung, z. B. Stempelraster als Text oder Bild.
- Critical: Feature kann auf einer Plattform nicht sinnvoll dargestellt werden oder benoetigt fehlende Partner-/Asset-Konfiguration.

Warnquellen:

- `walletDesign.ts` erzeugt `WalletDesignWarning[]`.
- Die Editor-UI zeigt plattformbezogene Hinweise direkt unter der Live-Vorschau an.
- Die Editor-UI zeigt zusaetzlich separate Apple-, Google- und Samsung-Vorschau-Skizzen; die oeffentliche Claim-Seite zeigt diese internen Hinweise nicht.
- Die Plattformvorschau zeigt das normalisierte Barcodeformat statt pauschal `QR`; bei Nicht-QR weist die Editor-UI auf die Samsung-Template-Abhaengigkeit hin.
- Standort-/Beacon-Konfiguration wird als Apple-native Relevanz markiert; Google/Samsung bekommen keinen identischen Standortbereich im aktuellen Mapping.
- Keine Editor-Funktion darf so dargestellt werden, als waere sie in Apple, Google und Samsung identisch moeglich.

## Security

- Keine Wallet-Credentials im Frontend.
- Keine Asset-Generierung im Browser.
- Wallet-Assets in Supabase Storage mit klarer Business-Zuordnung speichern.
- Public/signed URL nur dort verwenden, wo die Wallet-Plattform es verlangt.
- Updates muessen `owner_id`, `business_id`, `template_id` und `card_instance_id` pruefen.
- Browser-Antworten duerfen keine Secrets, privaten JWTs oder vollstaendigen Provider-Fehler mit sensiblen Details enthalten.
