

## Obiettivo
Nelle card di `Anagrafica Ragazzi`, evidenziare in **verde** i ragazzi che hanno compilato il modulo di iscrizione (cioè quelli per cui esiste una riga in `iscrizioni` con nome+cognome combaciante, in qualsiasi ordine).

## Logica di matching

Il `ragazzo.full_name` è una stringa unica, mentre in `iscrizioni` ci sono `ragazzo_nome` e `ragazzo_cognome` separati. Per coprire tutti i casi (nome-cognome o cognome-nome, spazi multipli, maiuscole/minuscole, accenti):

```ts
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
   .replace(/\s+/g, ' ').trim();

// Per ogni iscrizione costruisco DUE chiavi possibili:
const k1 = normalize(`${nome} ${cognome}`);
const k2 = normalize(`${cognome} ${nome}`);
// Il ragazzo è "iscritto" se normalize(full_name) === k1 || === k2
```

In più, per robustezza extra, confronto anche come **set di token** (ordino le parole alfabeticamente prima del confronto), così "Maria Rosa Bianchi" matcha "Bianchi Rosa Maria".

## Implementazione

### 1. `src/pages/AnagraficaRagazzi.tsx`

**a)** Nuovo hook locale `useIscrizioniNames` che carica una sola volta da Supabase tutti i `ragazzo_nome + ragazzo_cognome` dalla tabella `iscrizioni` e restituisce un `Set<string>` di chiavi normalizzate (entrambi gli ordini + token-sorted).

```ts
function useIscrizioniNames() {
  return useQuery({
    queryKey: ['iscrizioni-names'],
    queryFn: async () => {
      const { data } = await supabase
        .from('iscrizioni')
        .select('ragazzo_nome, ragazzo_cognome');
      const set = new Set<string>();
      (data || []).forEach((r) => {
        const n = normalize(r.ragazzo_nome || '');
        const c = normalize(r.ragazzo_cognome || '');
        if (!n && !c) return;
        set.add(`${n} ${c}`.trim());
        set.add(`${c} ${n}`.trim());
        set.add([...n.split(' '), ...c.split(' ')].filter(Boolean).sort().join(' '));
      });
      return set;
    },
  });
}
```

**b)** Helper per controllare il match:
```ts
const isIscritto = (fullName: string, set: Set<string>) => {
  const norm = normalize(fullName);
  if (set.has(norm)) return true;
  const sorted = norm.split(' ').sort().join(' ');
  return set.has(sorted);
};
```

**c)** Nel componente padre, chiamo `useIscrizioniNames()` una volta e passo il `Set` come prop a `RagazzoCard`.

**d)** In `RagazzoCard` (riga 82-127):
- Calcolo `const compilato = isIscritto(ragazzo.full_name, iscrizioniSet)`
- Se `compilato`:
  - La `Card` riceve classi extra: `bg-green-50 dark:bg-green-950/30 ring-2 ring-green-500/40`
  - La barretta in alto diventa verde: `bg-gradient-to-r from-green-500 to-emerald-500`
  - Aggiungo un piccolo badge verde "✓ Modulo compilato" accanto agli altri badge

### 2. Aggiornamento real-time

Per coprire i nuovi inserimenti senza refresh manuale, uso Supabase Realtime sulla tabella `iscrizioni`:

```ts
useEffect(() => {
  const channel = supabase
    .channel('iscrizioni-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'iscrizioni' },
        () => queryClient.invalidateQueries({ queryKey: ['iscrizioni-names'] }))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

Verifico che `iscrizioni` sia già nella `supabase_realtime` publication; se non lo è, aggiungo una migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.iscrizioni;
```

## Note
- Modifica solo cosmetica + un fetch in più (leggero, una select di due colonne).
- Non tocca la logica di archiviazione, numero, drawer.
- Funziona anche in retroattivo per i ragazzi già esistenti in entrambe le tabelle.

