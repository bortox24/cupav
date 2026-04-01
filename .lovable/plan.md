

## Piano: Campi dinamici selezionabili con etichette ed esempi

### Cosa cambia
Nello **Step 1** del wizard, i campi dinamici attualmente mostrati come semplici badge (`{{nome_ragazzo}}`, ecc.) diventeranno **etichette cliccabili** con una descrizione/esempio visibile. Cliccando su un'etichetta, il segnaposto verrà inserito nel textarea alla posizione del cursore.

Nell'**anteprima** (Step 2), i segnaposto `{{...}}` resteranno visibili così come sono — vengono sostituiti solo al momento dell'invio reale.

### Dettagli tecnici

**File**: `src/components/InvioMassivoDialog.tsx`

1. Definire un array di oggetti per i campi dinamici con label, placeholder e esempio:
   ```
   nome_ragazzo      → "Marco Rossi"
   nome_ragazzo_breve → "Marco"
   nome_genitore     → "Giuseppe Rossi"
   turno             → "1^ Media"
   numero            → "42"
   ```

2. Rendere ogni campo come un **bottone/badge cliccabile** con:
   - Nome leggibile (es. "Nome ragazzo")
   - Esempio sotto in grigio (es. `es: Marco Rossi`)
   - Click → inserisce `{{nome_ragazzo}}` nel textarea alla posizione del cursore

3. Aggiungere un `ref` al textarea per tracciare la posizione del cursore e inserire il testo nel punto corretto.

4. Nessuna modifica all'anteprima: i `{{...}}` restano visibili nello Step 2 come previsto.

### Nessuna modifica al backend
Edge function e logica di sostituzione invariate.

