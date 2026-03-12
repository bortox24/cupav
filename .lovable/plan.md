

## Piano: Fix nome staff nel PDF — Cognome + Nome

### Problema
Nel PDF, lo staff mostra il nome nel formato errato (possibile duplicazione del cognome). Serve il formato **"Cognome Nome"** coerente con i ragazzi.

### Modifiche in `src/pages/TurnoPage.tsx`

1. **PDF export (riga 778)**: Cambiare da `a.full_name + cognome` a `${a.cognome || ''} ${a.full_name}`.trim()
2. **Sorting staff nel PDF (righe 773-774)**: Invertire a `cognome + full_name` per ordinamento coerente
3. **Sorting staff nella tab Staff (righe 1037-1038)**: Stesso fix
4. **Display staff card (riga 1045)**: Mostrare `{a.cognome} {a.full_name}` invece di solo `{a.full_name}`
5. **Tende dialog (righe 158, 263)**: Invertire a `cognome + full_name`

Tutti i punti dove si visualizza o ordina lo staff verranno allineati al formato "Cognome Nome".

