

## Piano: Rimuovere hover verde dai pulsanti colore tenda

### Problema
I pulsanti di selezione colore tenda (Maschile/Femminile/Animatori) nel Drawer usano il componente `Button` con `variant="outline"`. Quando non selezionati, il variant outline applica `hover:bg-accent hover:text-accent-foreground` di default, dove `accent` nel tema CUPAV è un verde chiaro. Questo causa l'effetto hover verde indesiderato.

### Soluzione
Aggiungere classi `hover:bg-transparent` (o il colore appropriato per lo stato non selezionato) ai pulsanti non selezionati, e assicurarsi che anche gli stati selezionati non abbiano hover verde.

### File modificato
- `src/pages/TurnoPage.tsx` (riga ~191): aggiungere `hover:bg-transparent hover:text-current` alla classe dei pulsanti non selezionati per sovrascrivere l'hover verde del variant outline.

