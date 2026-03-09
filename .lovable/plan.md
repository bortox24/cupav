

## Piano: Aggiungere log per modifiche al numero nella card ragazzo

### Problema
Quando un utente inserisce, modifica o elimina il numero nella card di un ragazzo, l'azione non viene tracciata nei log (`anagrafica_invio_logs`).

### Soluzione
Modificare la funzione `handleBlur` nel componente `RagazzoCard` (righe 39-48) per inserire un log nella tabella `anagrafica_invio_logs` dopo ogni salvataggio riuscito del numero.

### Dettagli
- Serve recuperare l'utente corrente (`auth.getUser()`) e il profilo dentro `RagazzoCard` per popolare `inviato_da` e `inviato_da_nome`.
- Usare un nuovo valore `tipo` per distinguere l'azione, ad esempio:
  - `"numero_assegnato"` — quando si inserisce un numero dove prima era vuoto
  - `"numero_modificato"` — quando si cambia un numero esistente  
  - `"numero_rimosso"` — quando si svuota il campo
- Il campo `dettaglio` (o `successo`) può contenere info come "Da 5 a 12" o "Numero 5 rimosso".
- Dopo l'insert del log, invalidare la query `['anagrafica-invio-logs', ragazzo.id]` per aggiornare la lista log nel Drawer.

### Implementazione concreta
In `RagazzoCard` (riga 39-48), dopo il `toast.success`:
```typescript
const user = (await supabase.auth.getUser()).data.user;
if (user) {
  const profile = (await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()).data;
  const oldNum = ragazzo.numero;
  const newNum = val;
  let tipo = 'numero_modificato';
  let dettaglio = `Da ${oldNum} a ${newNum}`;
  if (oldNum == null && newNum != null) { tipo = 'numero_assegnato'; dettaglio = `Numero ${newNum} assegnato`; }
  else if (oldNum != null && newNum == null) { tipo = 'numero_rimosso'; dettaglio = `Numero ${oldNum} rimosso`; }
  
  await supabase.from('anagrafica_invio_logs').insert({
    ragazzo_id: ragazzo.id,
    inviato_da: user.id,
    inviato_da_nome: profile?.full_name || profile?.email || '',
    successo: true,
    tipo,
  });
}
```

Inoltre bisognerà passare `queryClient` a `RagazzoCard` (o usare `useQueryClient`) per invalidare i log.

### File modificato
- `src/pages/AnagraficaRagazzi.tsx` — componente `RagazzoCard`, funzione `handleBlur`

