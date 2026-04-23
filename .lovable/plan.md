
## Obiettivo
Sistemare due problemi:

1. In **Gestione Pagamenti**, l’importo dovuto deve rimanere sempre visibile anche quando il nome del ragazzo è lungo, inclusi layout stretti e mobile.
2. Nelle pagine **/turno**, evidenziare le iscrizioni duplicate con un badge/flag **“DOPPIONE”**.

## Analisi duplicati attuale

Ho controllato le iscrizioni raggruppando per turno e nome/cognome normalizzati, ignorando maiuscole/minuscole e spazi extra. Al momento risultano questi doppioni:

| Turno | Nome |
|---|---|
| 1° Media | Francesco Nichele |
| 3° Media | Cristian Garzon |
| 4° Elementare | Aurora Febbrile |
| 5° Elementare | Cristina Dallegno |
| 5° Elementare | Lina Zoljami |

Questi sono casi in cui esistono più righe nella tabella iscrizioni con lo stesso ragazzo nello stesso turno.

## Modifica 1 — Card Gestione Pagamenti

Nel file `src/pages/GestionePagamenti.tsx`, modifico l’header della card pagamento per evitare che il nome lungo spinga fuori il selettore dell’importo.

### Intervento tecnico

Nel componente `PagamentoCard`:

- Il contenitore del nome diventerà realmente comprimibile con `min-w-0`.
- Nome ragazzo e nome genitore useranno `truncate`.
- Il selettore importo resterà sempre visibile con `shrink-0`.
- Il layout userà una struttura più robusta:
  - avatar fisso
  - colonna testo flessibile e troncata
  - importo fisso a destra

Esempio risultato:
```text
[AG] Alessandro Giovanni...     [250€ v]
     Serena Tovo
```

Su mobile:
```text
[AG] Alessandro Giovanni...     [250€ v]
     Serena Tovo
```

L’importo non verrà mai tagliato o coperto dal testo.

## Modifica 2 — Rilevamento doppioni nei /turni

Nel file `src/pages/TurnoPage.tsx`, aggiungo una logica client-side per rilevare i doppioni tra le iscrizioni del turno corrente.

### Regola di confronto

Per ogni iscrizione creo una chiave normalizzata partendo da:

```text
ragazzo_nome + ragazzo_cognome
```

La normalizzazione copre:
- maiuscole/minuscole
- spazi doppi o finali
- punteggiatura semplice
- ordine nome/cognome tramite token ordinati

Esempio:
```text
"Francesco Nichele"
"FRANCESCO NICHELE"
"Francesco  Nichele "
"Nichele Francesco"
```

verranno considerati lo stesso ragazzo.

### Dove appare il flag

Aggiungo il badge **DOPPIONE**:

1. Nelle card della tab **Dettagli ragazzi**
2. Nelle card della tab **Appello**
3. Nel drawer dettaglio ragazzo
4. Nel PDF di download, aggiungendo una nota accanto al nome o una colonna “Segnalazione”

## Aspetto visivo del badge

Badge rosso ben visibile:

```text
DOPPIONE
```

Stile:
- sfondo rosso
- testo bianco o rosso scuro su rosso chiaro, coerente con il tema
- icona `AlertTriangle`
- non cliccabile

Nelle card:
```text
Mario Rossi        [DOPPIONE]
Genitore...
```

Nell’appello:
```text
Mario Rossi
[DOPPIONE]
```

## Dettagli tecnici

### In `TurnoPage.tsx`

Aggiungo un `useMemo`:

```ts
const duplicateIscrizioneIds = useMemo(() => {
  const groups = new Map<string, string[]>();

  iscrizioni.forEach((r) => {
    const key = normalizeDuplicateName(`${r.ragazzo_nome} ${r.ragazzo_cognome}`);
    groups.set(key, [...(groups.get(key) ?? []), r.id]);
  });

  const duplicates = new Set<string>();
  groups.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => duplicates.add(id));
  });

  return duplicates;
}, [iscrizioni]);
```

Poi passo il valore ai componenti:

```tsx
<RagazzoCompactCard
  r={r}
  isDuplicate={duplicateIscrizioneIds.has(r.id)}
/>
```

e:

```tsx
<AppelloCard
  r={r}
  isDuplicate={duplicateIscrizioneIds.has(r.id)}
/>
```

### In `RagazzoCompactCard`

Aggiungo prop:

```ts
isDuplicate?: boolean
```

e mostro il badge nell’header.

### In `AppelloCard`

Aggiungo prop:

```ts
isDuplicate?: boolean
```

e mostro il badge sotto al nome.

### Nel drawer dettaglio

Quando `selectedRagazzo` è doppione, mostro il badge nella sezione superiore insieme ai badge allergie/foto.

## Nessuna modifica database

Non serve creare nuove tabelle o colonne:
- i doppioni vengono calcolati al volo dai dati già presenti in `iscrizioni`
- quando arriva una nuova iscrizione, la pagina `/turno` aggiorna già i dati tramite realtime/invalidation, quindi il flag comparirà automaticamente

## File modificati

- `src/pages/GestionePagamenti.tsx`
- `src/pages/TurnoPage.tsx`
