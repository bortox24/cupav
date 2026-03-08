

## Piano: Fix salvataggio ruolo + aggiornamento card e turno

### Bug identificato
Il problema e' su **riga 554** di `AnagraficaAnimatori.tsx`: `setSelectedAnimatore(a)` salva uno **snapshot** dell'oggetto. Dopo il salvataggio e il refetch della query, lo state `selectedAnimatore` conserva ancora i dati vecchi. La card esterna e il drawer non si aggiornano.

### Fix

**`src/pages/AnagraficaAnimatori.tsx`**:
1. Invece di passare direttamente `selectedAnimatore` al drawer, derivare l'animatore aggiornato dall'array `animatori` usando l'id:
   - Salvare solo l'ID nello state (`selectedAnimatoreId`)
   - Derivare `selectedAnimatore` con `animatori.find(a => a.id === selectedAnimatoreId)`
   - Questo garantisce che il drawer mostri sempre i dati aggiornati dopo il refetch

### Nessun problema nella tab Staff dei turni
La pagina `TurnoPage.tsx` usa `useAnimatoriByTurno` che carica i dati direttamente dalla query, quindi il ruolo nei turni si aggiorna gia' correttamente dopo il refetch. Il sorting gerarchico e il badge ruolo sono gia' implementati.

### File modificati
- `src/pages/AnagraficaAnimatori.tsx` — cambiare da `selectedAnimatore` (oggetto) a `selectedAnimatoreId` (string) e derivare l'oggetto dall'array query

