

## Piano: Toast conferma numero + Fix layout modifica mobile

### Problema 1: Nessun feedback al salvataggio del numero
Il campo numero nella card salva su `onBlur` ma mostra un toast solo in caso di errore. Manca il feedback positivo.

**Soluzione:** Aggiungere `toast.success('Numero salvato')` dopo il salvataggio riuscito nel `handleBlur` del `RagazzoCard` (riga 36-41). Inoltre invalidare la query `ragazzi` per aggiornare i dati.

### Problema 2: Layout modifica si sfalsa su mobile
Quando si entra in modalità modifica nel Drawer, il contenuto diventa molto più lungo e lo scroll resta nella posizione precedente, mostrando una zona bianca.

**Soluzione:**
1. Aggiungere un `ref` al div scrollabile interno del Drawer
2. Nel `startEdit`, dopo aver impostato i dati, resettare lo scroll a 0 con `scrollRef.current.scrollTop = 0`
3. Assicurarsi che il DrawerContent abbia `min-h-0` per evitare overflow su mobile

### File modificato
- `src/pages/AnagraficaRagazzi.tsx`

