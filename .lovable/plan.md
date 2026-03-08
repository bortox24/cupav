

## Piano: Rimuovere il colore verde dal testo sui pulsanti colore tenda

### Problema
Il variant `outline` del Button ha la classe `hover:text-accent-foreground` (verde nel tema CUPAV). Anche se aggiungiamo `hover:text-current`, il merge Tailwind potrebbe non sovrascrivere correttamente. Inoltre, i pulsanti **selezionati** non hanno `hover:text-white`, quindi il verde del variant base può prevalere.

### Soluzione
In `src/pages/TurnoPage.tsx` riga ~182-191:
- Aggiungere `hover:text-white` a tutte le classi dei pulsanti selezionati
- Per i non selezionati, usare `variant="ghost"` invece di `variant="outline"` oppure sovrascrivere esplicitamente con classi inline che includono `hover:text-inherit`

Concretamente, il modo più pulito è rimuovere `variant="outline"` e usare `variant="ghost"` con bordo esplicito, oppure mantenere outline e aggiungere `hover:text-white` / `hover:text-current` espliciti in entrambi i casi (selezionato e non).

### File modificato
- `src/pages/TurnoPage.tsx` (~riga 182-191): aggiungere `hover:text-white` alle classi selezionate e confermare `hover:text-current` per le non selezionate

