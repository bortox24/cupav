

## Piano: Aggiornare il system prompt con il template HTML reale

### Problema
Il system prompt nella edge function `generate-email-html` descrive uno stile CUPAV approssimativo. Il PDF fornito contiene l'HTML esatto del template reale con colori, struttura e stili diversi.

### Differenze principali tra il prompt attuale e il template reale

| Aspetto | Prompt attuale | Template reale |
|---------|---------------|----------------|
| Sfondo pagina | `#f0fdf4` (verde chiaro) | `#f4f4f4` (grigio chiaro) |
| Header | Gradiente verde `#166534 → #15803d` | Colore piatto `#f2c10f` (giallo/ambra) con logo CUPAV |
| Titolo header | Testo bianco | Testo nero `#000000` |
| Container | border-radius 16px | border-radius 10px, box-shadow rgba |
| Titoli sezioni | `#166534` verde | `#1a5c2e` verde scuro |
| Testo normale | `#374151` | `#444444` |
| Tabella riepilogo header | `#166534` verde | `#1a5c2e` verde |
| Tabella righe | Alternate `#f9fafb` | Alternate con sfondo `#f9f9f9` e `#eeeeee` |
| Box informativi | Bordo verde `#22c55e` | Bordo `#f2c10f` (giallo) e sfondo `#fff8e1` |
| Box "cosa succede" | - | Sfondo `#e8f5e9`, bordo `#1a5c2e` |
| Footer | Sfondo `#f9fafb` | Sfondo `#1a5c2e` (verde scuro), testo chiaro |
| Logo | Nessuno | Logo da Supabase storage (160px) |

### Modifica

**File**: `supabase/functions/generate-email-html/index.ts`

Aggiornare la sezione `STILE CUPAV` nel `SYSTEM_PROMPT` con i valori esatti estratti dal template reale:

- Sfondo pagina: `#f4f4f4`
- Header: sfondo `#f2c10f` (giallo ambra), testo nero, logo CUPAV dal storage
- Container: `#ffffff`, border-radius 10px, box-shadow `rgba(0,0,0,0.1)`
- Titoli: `#1a5c2e`, font-size 22px
- Testo: `#444444`, font-size 15px, line-height 1.6
- Tabelle: header `#1a5c2e` testo bianco, righe `#f9f9f9`/`#eeeeee`, bordi `#e0e0e0`
- Box informativi: sfondo `#fff8e1`, bordo sinistro `#f2c10f`
- Box "prossimi passi": sfondo `#e8f5e9`, bordo sinistro `#1a5c2e`
- Footer: sfondo `#1a5c2e`, testo `#c8e6c9` e `#a5d6a7`
- Includere il tag `<img>` per il logo CUPAV dallo storage
- Contatti centrati, colore link `#1a5c2e`

Includere anche un blocco di HTML di esempio completo nel prompt per dare un riferimento concreto all'AI.

### Nessuna altra modifica
Il componente `InvioMassivoDialog.tsx` e i segnaposto dinamici restano invariati.

