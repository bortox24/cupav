

## Piano: Aggiungere ordinamento alfabetico secondario nello staff dei turni

### Problema
Attualmente lo staff nella tab turni è ordinato solo per gerarchia del ruolo (`RUOLO_ORDER`). All'interno dello stesso ruolo, l'ordine è casuale.

### Soluzione
Modificare le due `.sort()` in `TurnoPage.tsx` (riga ~770 per il PDF e riga ~1028 per la UI) aggiungendo un confronto alfabetico secondario su `full_name` + `cognome`:

```ts
.sort((a, b) => {
  const r = (RUOLO_ORDER[a.ruolo] || 99) - (RUOLO_ORDER[b.ruolo] || 99);
  if (r !== 0) return r;
  const nameA = `${a.full_name} ${a.cognome || ''}`.trim().toLowerCase();
  const nameB = `${b.full_name} ${b.cognome || ''}`.trim().toLowerCase();
  return nameA.localeCompare(nameB);
})
```

### File modificato
- `src/pages/TurnoPage.tsx` — due sort: riga ~770 (PDF) e riga ~1028 (UI cards)

