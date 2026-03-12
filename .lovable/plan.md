

## Piano: Fix duplicazione cognome staff

### Problema
Il campo `full_name` nella tabella `animatori` contiene già il nome completo (es. "Bortolamai Marco"), e il campo `cognome` contiene solo il cognome (es. "Bortolamai"). Il codice attuale concatena `cognome + full_name`, producendo "Bortolamai Bortolamai Marco".

### Soluzione
In tutti i punti di `TurnoPage.tsx` dove si costruisce il nome staff, usare solo `full_name` quando `cognome` è già incluso in esso, oppure (meglio) invertire l'ordine dentro `full_name` se serve "Cognome Nome".

Dato che `full_name` è già "Bortolamai Marco" (cognome + nome), basta usare **solo `full_name`** ovunque, senza prefissare `cognome`.

### Modifiche in `src/pages/TurnoPage.tsx`

Rimuovere tutte le concatenazioni `cognome + full_name` e usare solo `full_name`:

1. **Riga 158**: `s.cognome ? \`${s.cognome} ${s.full_name}\` : s.full_name` → `s.full_name`
2. **Riga 263**: stesso fix
3. **Righe 773-774**: sorting → usare solo `a.full_name` / `b.full_name`
4. **Riga 778**: PDF export → usare solo `a.full_name`
5. **Righe 1037-1038**: sorting tab Staff → solo `a.full_name` / `b.full_name`
6. **Riga 1045**: display card → solo `a.full_name`

Circa 10 punti da semplificare, tutti nello stesso file.

