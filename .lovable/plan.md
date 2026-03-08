

## Piano: Semplificare TendaCard + Aggiungere staff nelle tende Animatori

### 1. Semplificare `TendaCard` (righe 62-98)
- Rimuovere i nomi dalla SVG della tenda
- Mostrare solo: numero tenda + conteggio persone `(N/4)`
- Il colore resta come indicatore visivo

### 2. Aggiornare `TendaDrawer` (righe 103-241)
- Quando il colore selezionato e' `grigio` (Animatori), mostrare una sezione aggiuntiva "Aggiungi staff" con un Select che lista gli animatori del turno (da `useAnimatoriByTurno`)
- Gli staff aggiunti vengono salvati nello stesso array `assegnati` ma con un prefisso/marker (es. `[STAFF]Nome Cognome`) oppure piu' semplicemente vengono mostrati separatamente nell'UI ma salvati insieme
- Approccio migliore: salvare in `assegnati` normalmente, ma nel drawer distinguere visivamente staff vs ragazzi
- Il contatore "Ragazzi assegnati" nelle stats (riga 940-943) deve contare **solo ragazzi**, non staff

### 3. Logica staff nelle tende
- Passare al `TendaDrawer` anche la lista degli animatori del turno (`animatoriTurno`)
- Quando colore = `grigio`: mostrare solo il Select staff (non ragazzi)
- Quando colore = `blu` o `rosa`: mostrare solo il Select ragazzi (comportamento attuale)
- Lo staff non viene conteggiato in `allAssigned` ai fini delle stats "Ragazzi assegnati"

### 4. Distinguere staff da ragazzi nei dati
- Usare un prefisso `§` nei nomi staff salvati in `assegnati` (es. `§Mario Rossi`)
- Nel TendaCard mostrare solo il count numerico (quindi il prefisso non importa visivamente)
- Nel TendaDrawer, al rendering degli occupanti, rimuovere il prefisso per mostrare il nome pulito + badge "Staff"
- `availableRagazzi` filtra solo nomi senza prefisso `§`; `availableStaff` filtra solo nomi con prefisso `§`

### File modificati
- `src/pages/TurnoPage.tsx`:
  - `TendaCard`: rimuovere nomi, lasciare solo numero + count
  - `TendaDrawer`: aggiungere prop `availableStaff`, logica condizionale per colore grigio
  - Calcolo stats: escludere staff dal conteggio ragazzi assegnati
  - Passare animatori del turno al drawer

