# El-Promillo-Redesign zurücksetzen

Vor dem visuellen Redesign wurde ein lokales Backup der Frontend-Dateien angelegt:

```text
backups/before-elpromillo-redesign-20260704-1435
```

Wenn dir der neue Look nicht gefällt, kannst du den vorherigen Stand so wiederherstellen:

```bash
./scripts/restore-before-elpromillo-redesign.sh
```

Das Script kopiert nur die gesicherten Frontend-Dateien zurück:

- `public/*.html`
- `public/styles.css`
- `public/js/*.js`
- vorhandene Dateien unter `public/assets`

Supabase, Datenbank, Edge Functions, Secrets und Wallet-Konfiguration werden dadurch nicht verändert.
