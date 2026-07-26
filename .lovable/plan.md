## Obiettivo

Mostrare il totale da pagare per ogni famiglia nella pagina `/turno/turno-famiglie`, il totale complessivo del turno nelle KPI in alto, e riportare gli stessi dati nel PDF scaricabile.

## Cosa cambia

### 1. Card famiglia (pagina Turno Famiglie)
- In ogni card, sotto la riga "Partecipanti", aggiungere una riga **"Totale da pagare"** con l'importo in euro, evidenziato (stile arancione coerente con la pagina).
- L'importo usa esattamente la stessa fonte dell'anagrafica: `importo_totale_calcolato` salvato sull'iscrizione; se assente, viene ricalcolato con l'esploso per partecipante (`buildRigheEsploso` + `calcolaTotaleEsploso`) moltiplicato per le **notti** — quindi il valore coincide sempre con quello visto in `/anagrafica-turno-famiglie`.

### 2. KPI in alto
- Il blocco KPI passa da 3 a 4 riquadri: Famiglie, Persone, Animali, **Totale € da incassare** (somma dei totali di tutte le famiglie non archiviate).
- Layout responsive: 2 colonne su mobile, 4 su desktop, così il valore in euro resta leggibile.

### 3. PDF (`Scarica PDF`)
- Sotto l'header arancione, aggiungere una **fascia riepilogo KPI** con 4 box: Famiglie, Persone, Animali, Totale complessivo €.
- In fondo al documento (ultima pagina, dopo l'ultima famiglia) aggiungere una riga di chiusura **"TOTALE TURNO FAMIGLIE: € X"**.
- Ogni sezione famiglia continua a mostrare il "Totale famiglia" già presente.

## Dettagli tecnici

- `src/pages/TurnoFamigliePage.tsx`: helper `totaleFamiglia(item, tariffe)` (riuso di `calcolaNotti`/`buildRigheEsploso`/`calcolaTotaleEsploso` da `src/lib/tariffeFamiglie.ts`), `useMemo` per la somma; formattazione con `formatEuro`.
- `src/lib/exportFamigliePdf.ts`: calcolo del totale complessivo prima del loop; disegno della fascia riepilogo con `roundedRect` + testo (solo ASCII/WinAnsi, `setCharSpace(0)` come già fatto) e blocco totale finale con gestione salto pagina.
- Nessuna modifica al database: i dati sono già su `iscrizioni_famiglie`.
