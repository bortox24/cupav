
# Divisori come sezioni visive nel modulo pubblico

## Cosa cambia

Attualmente il divisore e' solo una sottile linea orizzontale (`Separator`) che su mobile e' poco visibile. L'idea e' trasformarlo in un vero "stacco di sezione": i campi tra un divisore e l'altro verranno raggruppati in card separate con padding e bordi arrotondati, creando un effetto visivo chiaro di separazione.

## Come funzionera'

Il form passera' da un layout piatto (tutti i campi in un unico blocco) a un layout a sezioni:

- I campi vengono divisi in gruppi usando i divisori come separatori
- Ogni gruppo viene renderizzato dentro un contenitore con sfondo, bordo e spacing dedicato
- Tra un gruppo e l'altro ci sara' uno spazio vuoto evidente
- Su mobile l'effetto sara' ancora piu' chiaro grazie al contrasto tra sfondo pagina e sfondo sezione

## Dettagli tecnici

### File: `src/pages/public/ModuloForm.tsx`

Modifica alla funzione `renderFields`:

1. Dividere l'array di campi in gruppi (sezioni) usando i campi di tipo `divider` come separatore
2. Ogni sezione viene wrappata in un `div` con classi tipo `bg-muted/30 rounded-lg p-4 md:p-6 space-y-6 border border-border/50`
3. Tra le sezioni viene aggiunto un `div` con margin verticale (`my-4`) per lo stacco
4. La prima sezione (prima del primo divisore) e l'ultima non hanno trattamento speciale, sono tutte uguali

La logica dei campi half-width rimane invariata all'interno di ogni sezione.

### Nessuna modifica al database o al FormBuilder

La struttura dati del divisore resta identica (tipo `divider`), cambia solo come viene visualizzato nel form pubblico.
