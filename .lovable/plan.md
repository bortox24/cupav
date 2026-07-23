
# Download PDF lista famiglie in `/turno/turnofamiglie`

Aggiungo un pulsante **"Scarica PDF"** nella toolbar di `TurnoFamigliePage`, a sinistra del pulsante **Calendario**, che genera un PDF A4 verticale con una sezione per ogni famiglia iscritta (non archiviata).

## UI

Nella riga toolbar attuale (`Calendario` + `Apri anagrafica completa`), inserisco come primo elemento:

- Pulsante `outline` con icona `Download` → `Scarica PDF`

Ordine finale (da sinistra a destra): **Scarica PDF · Calendario · Apri anagrafica completa**.

## Contenuto del PDF

- Formato: **A4 verticale**, generato con `jspdf` + `jspdf-autotable` (già usati in `TurnoPage.tsx` e `exportMontaggioPdf.ts`, quindi nessuna nuova dipendenza).
- Header prima pagina: titolo "Turno Famiglie – CUPAV 2026" + data di generazione + totale famiglie / persone / animali.
- **Una sezione per famiglia**, ordinate per `cognome, nome`. Ogni sezione contiene:
  1. **Intestazione famiglia**: `Cognome Nome` (grande) + riga sotto con `Residente a …`, `Periodo dd/MM – dd/MM/yyyy`, `Giorni: N`.
  2. **Riepilogo composizione** (tabella compatta a 2 colonne, destra come richiesto):
     - Adulti: N
     - Figli >10 anni: N
     - Bambini 4–10 anni: N
     - Bambini 0–3 anni: N
     - Animali: N (mostrato solo se > 0)
  3. **Tabella partecipanti** costruita con `buildRigheEsploso` (stessa logica dell'anagrafica famiglie), colonne:
     - `Partecipante` (es. "Adulto 1", "1° figlio >10 anni", "Bambino 4–10 #1", "Bambino 0–3 #1")
     - `Quota/giorno (€)`
     - `Giorni`
     - `Totale (€)`
     - Riga finale **"Totale famiglia"** con la somma (usa `importo_totale_calcolato` se presente, altrimenti ricalcolato con `calcolaTotaleEsploso`).
- Separatore sottile tra sezioni; page-break automatico gestito da `autoTable` (se la sezione non entra, va a pagina nuova).
- Footer con numero pagina `Pagina X di Y`.

Nessuna colonna "categoria tariffaria" – coerente con la scelta già fatta di nasconderla.

## Permessi

Il download è visibile a tutti gli utenti che oggi vedono la pagina `/turno/turnofamiglie` (nessuna restrizione staff-specifica: la pagina non è nel flusso account staff limitato).

## File toccati

- `src/lib/exportFamigliePdf.ts` (nuovo): funzione `exportFamigliePdf(items, tariffeDefault)` che costruisce il PDF usando `buildRigheEsploso` da `src/lib/tariffeFamiglie.ts`.
- `src/pages/TurnoFamigliePage.tsx`: import del nuovo helper + hook `useTariffeFamiglie` per i prezzi di default (fallback quando `prezzi_partecipanti` non è ancora stato personalizzato), nuovo bottone "Scarica PDF" nella toolbar.

## Fuori scopo

- Non tocco `AnagraficaTurnoFamiglie` né la logica di calcolo/persistenza dei prezzi.
- Non aggiungo filtri o selezione colonne: la lista è fissa come sopra.
