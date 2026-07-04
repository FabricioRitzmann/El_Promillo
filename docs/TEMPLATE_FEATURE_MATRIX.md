# Template Feature Matrix

> Diese Datei wird automatisch aus `public/js/templateFeatures.js` erzeugt. Bitte nicht manuell bearbeiten.

Diese Matrix ist die zentrale Wahrheit dafür, welche Funktionen ein Kartentemplate im Editor, Scanner, Wallet, PDF und Backend verwenden darf.

Werte:

- `ja`: Feature ist für diesen Template-Typ immer aktiv.
- `optional`: Feature ist nur aktiv, wenn es in den Template-Einstellungen explizit eingeschaltet wurde.
- `nein`: Feature ist für diesen Template-Typ verboten und muss im Backend blockiert werden.

Optionale Features können im MVP über `settings.enabledFeatures`, `settings.features.<feature>` oder `settings.<feature>Enabled` aktiviert werden.

Hinweis zu `notifications`: Die Matrix erlaubt Wallet-Benachrichtigungen für alle aktuellen Template-Typen. Ein einzelnes Template kann sie trotzdem explizit über `settings.notificationsEnabled = false` oder `settings.features.notifications = false` deaktivieren; Browser, Edge Functions und SQL respektieren dieses Opt-out.

## Template-Typen

| Template Type | Label |
| --- | --- |
| stamp_card | Stempelkarte |
| streak_card | Streak-Karte |
| vip_card | VIP-/Memberkarte |
| balance_card | Aufladbare Guthabenkarte |
| cloakroom_card | Garderobenkarte |
| generic_card | Generische Basiskarte |
| event_card | Eventkarte |
| coupon_card | Couponkarte |
| membership_card | Mitgliedskarte |
| club_card | Clubkarte |

## Feature-Matrix

| Feature | Label | stamp_card | streak_card | vip_card | balance_card | cloakroom_card | generic_card | event_card | coupon_card | membership_card | club_card |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stamps | Stempel | ja | nein | nein | nein | nein | nein | nein | nein | nein | nein |
| streak | Streak | nein | ja | nein | nein | nein | nein | nein | nein | nein | nein |
| vip | VIP | nein | nein | ja | nein | nein | nein | nein | nein | optional | optional |
| balance | Guthaben | nein | nein | optional | ja | nein | optional | nein | nein | nein | optional |
| cloakroom | Garderobe | optional | optional | optional | optional | ja | optional | optional | optional | optional | optional |
| qrPdf | QR/PDF | ja | ja | ja | ja | ja | ja | ja | ja | ja | ja |
| notifications | Push | ja | ja | ja | ja | ja | ja | ja | ja | ja | ja |
| customFields | Freifelder | nein | nein | ja | nein | nein | ja | ja | nein | ja | ja |
| visit | Besuch | nein | nein | ja | nein | nein | ja | nein | nein | nein | ja |
| checkin | Check-in | nein | nein | nein | nein | nein | nein | ja | nein | nein | nein |
| redemption | Einlösung | nein | nein | nein | nein | nein | nein | nein | ja | nein | optional |
| membership | Mitgliedschaft | nein | nein | nein | nein | nein | nein | nein | nein | ja | optional |
| eventBackgroundImage | Eventbild | nein | nein | nein | nein | nein | nein | ja | nein | nein | nein |

## Scanner-Aktionen

Scanner-Aktionen werden vor dem Speichern normalisiert und gegen diese Matrix validiert.

| Aktion | Feature | Label | Blockierter Grund |
| --- | --- | --- | --- |
| stamp-plus | stamps | Stempel hinzufügen | Diese Karte unterstützt keine Stempel-Funktion. |
| stamp-minus | stamps | Stempel entfernen | Diese Karte unterstützt keine Stempel-Funktion. |
| stamp-redeem | stamps | Volle Stempelkarte einlösen | Diese Karte unterstützt keine Stempel-Funktion. |
| streak-plus | streak | Streak erhöhen | Diese Karte unterstützt keine Streak-Funktion. |
| streak-reset | streak | Streak zurücksetzen | Diese Karte unterstützt keine Streak-Funktion. |
| streak-complete | streak | Streak-Ziel erfüllen | Diese Karte unterstützt keine Streak-Funktion. |
| vip-update | vip | VIP-Status aendern | Diese Karte unterstützt keine VIP-Funktion. |
| vip-benefit-redeem | vip | VIP-Vorteil einlösen | Diese Karte unterstützt keine VIP-Funktion. |
| balance-redeem | balance | Guthaben abbuchen | Diese Karte unterstützt keine Guthaben-Funktion. |
| balance-adjust | balance | Guthaben korrigieren | Diese Karte unterstützt keine Guthaben-Funktion. |
| cloakroom-toggle | cloakroom | Garderobe umschalten | Diese Karte unterstützt keine Garderoben-Funktion. |
| visit | visit | Besuch erfassen | Diese Karte unterstützt keine Besuchs-Funktion. |
| checkin | checkin | Check-in | Diese Karte unterstützt keine Check-in-Funktion. |
| event-checkout | checkin | Check-out | Diese Karte unterstützt keine Check-in-Funktion. |
| event-ticket-use | checkin | Ticket als verwendet markieren | Diese Karte unterstützt keine Check-in-Funktion. |
| redeem | redemption | Einlösen | Diese Karte unterstützt keine Einlöse-Funktion. |
| membership-check | membership | Mitgliedschaft prüfen | Diese Karte unterstützt keine Mitgliedschafts-Funktion. |
| membership-status-update | membership | Mitgliedsstatus aendern | Diese Karte unterstützt keine Mitgliedschafts-Funktion. |
| membership-extend | membership | Mitgliedschaft verlängern | Diese Karte unterstützt keine Mitgliedschafts-Funktion. |

## Scanner-Aliase

Diese Aliase erlauben sprechende Aktionsnamen in Edge Functions oder späteren Clients, ohne die interne Scanner-Aktion zu duplizieren.

| Alias | Normalisierte Aktion |
| --- | --- |
| add_stamp | stamp-plus |
| increment_stamp | stamp-plus |
| remove_stamp | stamp-minus |
| decrement_stamp | stamp-minus |
| redeem_stamp | stamp-redeem |
| redeem_stamp_card | stamp-redeem |
| mark_stamp_card_redeemed | stamp-redeem |
| increment_streak | streak-plus |
| reset_streak | streak-reset |
| complete_streak | streak-complete |
| fulfill_streak_goal | streak-complete |
| mark_streak_goal_complete | streak-complete |
| update_vip | vip-update |
| change_vip_level | vip-update |
| redeem_vip_benefit | vip-benefit-redeem |
| redeem_benefit | vip-benefit-redeem |
| use_vip_benefit | vip-benefit-redeem |
| redeem_balance | balance-redeem |
| adjust_balance | balance-adjust |
| correct_balance | balance-adjust |
| manual_adjust_balance | balance-adjust |
| redeem_coupon | redeem |
| mark_coupon_used | redeem |
| check_in | checkin |
| event_checkin | checkin |
| check_out | event-checkout |
| event_checkout | event-checkout |
| ticket_used | event-ticket-use |
| use_ticket | event-ticket-use |
| mark_ticket_used | event-ticket-use |
| mark_event_ticket_used | event-ticket-use |
| membership_check | membership-check |
| check_membership | membership-check |
| update_membership_status | membership-status-update |
| change_membership_status | membership-status-update |
| extend_membership | membership-extend |
| renew_membership | membership-extend |
| record_visit | visit |
| cloakroom_dropoff | cloakroom-toggle |
| cloakroom_pickup | cloakroom-toggle |

