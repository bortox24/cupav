

## Piano: Tab "Tende" con numerazione per riga

### Layout tende (dallo screenshot)

Ogni riga ha numerazione indipendente, da destra a sinistra:

```text
Riga 1 (top):              [2] [1]        (col 3-4, 2 tende)
Riga 2:           [4] [3] [2] [1]         (4 tende)
Riga 3:           [4] [3] [2] [1]         (4 tende)
Riga 4:           [4] [3] [2] [1]         (4 tende)
Riga 5 (bottom):  [2] [1]                 (col 1-2, 2 tende)
```

### Database

Tabella `tende` — una riga per tenda per turno:

```sql
CREATE TABLE public.tende (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno text NOT NULL,
  riga integer NOT NULL,          -- 1..5
  numero integer NOT NULL,        -- 1..4 (o 1..2)
  colore text NOT NULL DEFAULT 'grigio',
  assegnati jsonb NOT NULL DEFAULT '[]',  -- max 4 nomi
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(turno, riga, numero)
);

ALTER TABLE public.tende ENABLE ROW LEVEL SECURITY;
-- CRUD per authenticated
```

`assegnati` è un array JSON tipo `["Mario Rossi", "Anna Bianchi"]` (max 4 elementi). Niente FK complesse, solo nomi.

### UI (`TurnoPage.tsx`)

1. **Nuovo tab pill** "Tende" con icona `Tent` (o `LayoutGrid`).

2. **Griglia CSS 4 colonne** che replica la disposizione:
   - Riga 1: 2 celle in colonne 3-4
   - Righe 2-4: 4 celle piene
   - Riga 5: 2 celle in colonne 1-2

3. **Ogni cella/tenda** mostra:
   - Bordo colorato (blu/rosa/grigio)
   - Sfondo tenue corrispondente
   - Numero della tenda (es. "1")
   - Conteggio occupanti (es. "2/4")
   - Nomi assegnati (troncati)

4. **Click su tenda** → Drawer con:
   - Titolo "Riga X — Tenda N"
   - 3 pulsanti colore (blu, rosa, grigio) — selezionabile
   - Lista occupanti con pulsante rimuovi (×)
   - Select per aggiungere ragazzo (filtrato tra iscritti al turno, non ancora assegnati a nessuna tenda), max 4

5. **Dati**: query `tende` filtrata per turno. Upsert al salvataggio colore/assegnati.

### File modificati
- `src/pages/TurnoPage.tsx` — tab + griglia + drawer assegnazione
- **1 migrazione SQL** — tabella `tende`

