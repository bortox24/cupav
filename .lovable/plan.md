

## Piano: Icone tenda, nomi per esteso, colori pulsanti coerenti

### Cosa cambia

1. **TendaCard** (righe 61-83): sostituire il rettangolo `Card` con un SVG a forma di tenda (triangolo/casetta stilizzata) che contiene il numero e i nomi per esteso. Colore di sfondo/fill della tenda basato su `colore` (blu, rosa, grigio). Responsive: su mobile le tende si ridimensionano proporzionalmente.

2. **Pulsanti colore nel TendaDrawer** (righe 147-163): quando selezionato, il pulsante assume il colore corrispondente (blu per Maschile, rosa per Femminile, grigio per Animatori) invece del verde `default`. I pulsanti non selezionati restano `outline` con bordo del colore.

### Dettagli implementazione

#### TendaCard — Icona tenda SVG
- Usare un SVG inline con path a forma di tenda (triangolo con base rettangolare)
- Il fill usa i colori: `fill-blue-100`/`stroke-blue-500` per blu, `fill-pink-100`/`stroke-pink-400` per rosa, `fill-gray-100`/`stroke-gray-400` per grigio
- All'interno (via `foreignObject` o posizionamento assoluto sopra l'SVG): numero tenda in alto, nomi completi sotto (font ridotto, `text-[10px]` su mobile, `text-xs` su desktop)
- Il contenitore usa `aspect-ratio` per mantenere proporzioni
- Su mobile (griglia 4 colonne): tende più piccole con nomi che vanno a capo o si troncano con `line-clamp-1`

#### Pulsanti colore — Drawer
- Quando `colore === key`: applicare classi di sfondo specifiche invece di `variant="default"`:
  - `blu`: `bg-blue-500 text-white hover:bg-blue-600`
  - `rosa`: `bg-pink-400 text-white hover:bg-pink-500`
  - `grigio`: `bg-gray-500 text-white hover:bg-gray-600`
- Quando non selezionato: `variant="outline"` con bordo e testo del colore (come ora)

### File modificato
- `src/pages/TurnoPage.tsx` (componenti `TendaCard` righe 61-83 e `TendaDrawer` righe 147-163)

