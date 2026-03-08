

## Piano: Aggiungere ruolo "Responsabile Animatori" + Ordinamento gerarchico Staff nei turni

### 1. Aggiornare `src/hooks/useAnimatori.ts`
- Aggiungere `responsabile_animatori` a `RUOLO_LABELS` ("Resp. Animatori") e `RUOLO_COLORS` (colore viola/purple)
- Aggiungere costante `RUOLO_ORDER` per l'ordinamento gerarchico:
  1. `responsabile_campo`
  2. `cuoco`
  3. `responsabile_animatori`
  4. `animatore`

### 2. Aggiornare `src/pages/AnagraficaAnimatori.tsx`
- Nel Select del ruolo (sia nel drawer di modifica che nel form di aggiunta), aggiungere l'opzione "Responsabile Animatori"
- Nel filtro ruolo aggiungere "Resp. Animatori"

### 3. Aggiornare `src/pages/TurnoPage.tsx`
- Nella tab Staff, ordinare la lista `animatoriTurno` usando `RUOLO_ORDER` prima di renderizzare le card
- Anche nel PDF, ordinare la sezione Staff con lo stesso criterio

### 4. Aggiornare `src/pages/public/ModuloStaff.tsx`
- Aggiungere "Responsabile Animatori" come opzione nel Select del ruolo nel modulo pubblico

### File coinvolti
- `src/hooks/useAnimatori.ts` — nuove costanti ruolo + ordine
- `src/pages/AnagraficaAnimatori.tsx` — opzione ruolo nel drawer/form e filtro
- `src/pages/TurnoPage.tsx` — sorting gerarchico nella tab staff e nel PDF
- `src/pages/public/ModuloStaff.tsx` — opzione ruolo nel modulo pubblico

Nessuna migrazione DB necessaria: il campo `ruolo` è già `text`, basta usare il nuovo valore.

