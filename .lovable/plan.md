
# Turno Famiglie: notti + fix testi PDF

## 1) Passare da "giorni" a "notti" nel Turno Famiglie

Il prezzo si applica per **notte trascorsa in campeggio**, non per giorno. Le date di inizio/fine restano quelle indicate dalla famiglia, ma il moltiplicatore diventa **notti = giorni − 1** (min 0). Esempio: 08/08 → 15/08 = **7 notti**.

### `src/lib/tariffeFamiglie.ts`
- Aggiungo `calcolaNotti(dataInizio, dataFine) = max(calcolaGiorni(...) − 1, 0)`.
- `calcolaTotaleFamiglia`: usa `notti` come moltiplicatore; rinomino `giorni` → `notti` in `RisultatoCalcolo` e in `RigaCalcolo`.
- `calcolaTotaleEsploso(righe, notti)`: firma invariata, il parametro ora rappresenta le notti.

### `src/pages/AnagraficaTurnoFamiglie.tsx`
- Sostituisco tutte le etichette UI "Giorni" → "Notti" nel drawer di modifica e nella vista read-only.
- Uso `calcolaNotti(...)` come moltiplicatore e come valore mostrato nella colonna.
- `handleSave` ricalcola `importo_totale_calcolato` usando le notti.

### `src/lib/exportFamigliePdf.ts`
- Colonna tabella: intestazione **"Giorni" → "Notti"**, valore = `calcolaNotti(...)`.
- Intestazione famiglia mostra `N notti` invece di `N giorni`.
- Totale per riga = `prezzoGiorno × notti`.

### Backfill
Nessun UPDATE massivo: `importo_totale_calcolato` verrà rigenerato al primo salvataggio dell'iscrizione, mentre il PDF calcola sempre al volo, quindi resta coerente. Se vuoi anche un ricalcolo massivo one-shot dimmelo.

## 2) Fix formattazione testi PDF

Nello screenshot il testo appare "spaziato" e tra le date compare `!'` invece di `→`. Causa: jsPDF con font Helvetica usa la codifica **WinAnsi**, che non supporta caratteri Unicode come `→`, `–` (en-dash), `•`; quando li incontra li sostituisce con glifi errati e altera la spaziatura dell'intera riga.

Correzioni nel solo file `src/lib/exportFamigliePdf.ts` (nessuna dipendenza nuova, PDF resta leggerissimo):

- Sostituisco `→` con `-` nella riga "Periodo".
- Sostituisco il separatore `•` con `·` compatibile o direttamente `|` sicuro in WinAnsi (uso `  |  `).
- Sostituisco l'en-dash `–` di `"4–10"` e `"0–3"` con `-` (`"4-10"`, `"0-3"`).
- Esplicito `doc.setCharSpace(0)` prima di ogni `doc.text` per neutralizzare eventuali spacing residui.

Nessun altro cambiamento estetico al PDF: layout, colori arancioni, tabella e piè di pagina restano identici.

## Fuori scopo
- Modulo pubblico `IscrizioneFamiglie` e card "Tariffe Famiglie" in Impostazioni: non usano queste utility e non li tocco.
- `Turno Montaggio`: modello a notti separato, invariato.
