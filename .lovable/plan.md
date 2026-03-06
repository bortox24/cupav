

## Piano: Ordinamento condizionale per turno

### Cosa cambia

Quando si filtra per un turno specifico, i ragazzi attivi vengono ordinati:
1. **Primario**: per `numero` (crescente, chi non ha numero va in fondo)
2. **Secondario**: per `full_name` alfabetico

Quando il filtro è "Tutti i turni" (`all`), si mantiene solo l'ordine alfabetico per `full_name`.

### Implementazione (`src/pages/AnagraficaRagazzi.tsx`)

Dopo la riga 683 dove viene definito `attivi`, aggiungere un `.sort()`:

```typescript
const attivi = (ragazzi?.filter(...) || []).sort((a, b) => {
  if (filterTurno !== 'all') {
    // Con turno filtrato: prima per numero, poi alfabetico
    const aNum = a.numero ?? Infinity;
    const bNum = b.numero ?? Infinity;
    if (aNum !== bNum) return aNum - bNum;
  }
  return a.full_name.localeCompare(b.full_name, 'it');
});
```

Stessa logica applicata anche ad `archiviati` (riga 684).

### File modificato
- `src/pages/AnagraficaRagazzi.tsx` (righe 683-684)

