

## Piano: Cognome + Nome nelle card ragazzi in /turno/...

### Problema
Attualmente le card mostrano "Nome Cognome" (es. "Celeste Gaianigo"). Deve diventare "Cognome Nome" (es. "Gaianigo Celeste").

### Modifiche in `src/pages/TurnoPage.tsx`

Tutte le occorrenze di `ragazzo_nome ragazzo_cognome` vanno invertite in `ragazzo_cognome ragazzo_nome`:

1. **RagazzoCompactCard** (righe 285, 300, 303): iniziali e nome visualizzato
2. **RagazzoDetailDrawer** (righe 364, 376): iniziali e titolo drawer
3. **AppelloCard** (riga 451): nome nell'appello
4. **Sorting** (righe 644-646, 653-655): ordinamento per cognome prima, poi nome
5. **PDF export** (riga 745): ordine nel PDF
6. **Search filter** (riga 635): ricerca con cognome+nome

In totale circa 12 punti da invertire, tutti nello stesso file.

