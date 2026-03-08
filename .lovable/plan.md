

## Piano: Rinomina tab "Staff" + Download con selezione Ragazzi/Staff

### 1. Rinomina tab "Animatori" → "Staff"
- Linea 786: cambiare testo da "Animatori" a "Staff"
- Linea 941: aggiornare messaggio vuoto ("Nessuno staff assegnato...")
- Linea 948: aggiornare conteggio ("X staff assegnati")

### 2. Trasformare "Download lista" da azione diretta a tab con checkbox
Attualmente il click su "Download lista" chiama direttamente `handleDownloadPDF()`. Cambiare in:
- Diventa una tab vera (`download-lista` gia' definita nel type ma non usata come tab)
- Mostra una card con due checkbox: **Ragazzi** e **Staff**
- Almeno uno deve essere selezionato
- Pulsante "Scarica PDF"

### 3. PDF con sezioni
Il PDF generato includera':
- **Se "Ragazzi" selezionato**: sezione "Ragazzi" con tabella (Nome Cognome Ragazzo, Genitore, Telefono) — come oggi
- **Se "Staff" selezionato**: sezione "Staff" con tabella (Nome Cognome, Ruolo, Telefono, Email)
- Se entrambi: unico file con entrambe le sezioni una dopo l'altra

### File modificati
- `src/pages/TurnoPage.tsx` — unico file da modificare

