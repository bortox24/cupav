## Risultato del controllo immediato

Ho ricontrollato il database: i 4 doppioni rimossi non esistono più in `iscrizioni`, non hanno più record collegati in `pagamenti` e non hanno log di sollecito collegati.

Ho anche rifatto il controllo generale dei doppioni per stesso turno + nome/cognome ragazzo: al momento il database restituisce **0 doppioni**.

Situazione attuale iscrizioni per turno:

```text
1° Media        21 iscrizioni
2° Media        17 iscrizioni
3° Media        13 iscrizioni
4° Elementare   27 iscrizioni
5° Elementare   37 iscrizioni
```

Quindi se nell’Appello vedi ancora quei nomi doppi, molto probabilmente non sono più righe duplicate nella tabella `iscrizioni`: è la pagina che sta mostrando dati rimasti in cache nel browser/app, oppure una lista derivata non si è riallineata subito.

## Perché può succedere

La pagina `/turno` prende i ragazzi da `iscrizioni`, quindi sì: i dati principali arrivano dal database.

Però la pagina usa anche una cache lato app tramite React Query. In più, il realtime è configurato nel codice, ma va reso più robusto per coprire bene questi casi:

- quando una riga viene cancellata direttamente dal database
- quando l’utente è già dentro la tab Appello
- quando la lista dei presenti (`presentSet`) contiene ancora ID non più presenti
- quando Realtime non notifica perché la tabella/pubblicazione o il filtro non si riallineano subito
- quando si torna sulla finestra/app dopo una modifica fatta altrove

Ho verificato che `iscrizioni` è già nella pubblicazione realtime; quindi non serve abilitarla da zero. Serve migliorare il comportamento della pagina.

## Piano di sistemazione

### 1. Forzare il refresh dei dati entrando nei turni

In `src/pages/TurnoPage.tsx` imposto la query delle iscrizioni in modo più sicuro:

- `staleTime: 0`, così i dati vengono considerati subito da ricaricare
- `refetchOnMount: 'always'`, così entrando nella pagina o tornando al componente rilegge dal database
- `refetchOnWindowFocus: true`, così se il database cambia mentre la pagina era aperta, tornando sulla finestra si aggiorna
- `refetchOnReconnect: true`, così se la connessione cade e torna, rilegge i dati

### 2. Realtime più mirato sulla tabella `iscrizioni`

Aggiorno la subscription realtime di `/turno` per ascoltare `INSERT`, `UPDATE` e `DELETE` su `iscrizioni` e invalidare/rileggere sempre:

- `['turno-iscrizioni', turnoValue]`
- eventuali contatori legati ai turni
- eventuali query pagamenti collegate quando cambia un’iscrizione

Questo evita che la pagina Appello resti con una lista vecchia.

### 3. Pulizia automatica dello stato Appello

Aggiungo una sincronizzazione tra `presentSet` e la lista reale `iscrizioni`.

Se una iscrizione è stata rimossa dal database ma il suo ID era ancora presente nello stato locale dell’appello, viene tolta automaticamente da `presentSet`.

Così anche il conteggio `Presenti X/Y` non può rimanere sporco.

### 4. Controllo tende/lista assegnati

Ho controllato la tabella `tende`: i nomi dei doppioni rimossi non risultano assegnati nelle tende.

Non serve cancellare nulla lì adesso. Però posso aggiungere una protezione: quando si apre la lista tende, i ragazzi selezionabili arrivano solo dalle iscrizioni correnti; quindi, dopo il refresh, non potranno più comparire rimossi.

### 5. Gestione Pagamenti

`Gestione Pagamenti` legge da `iscrizioni` + `pagamenti`. I record dei doppioni rimossi sono già spariti dal database.

Aggiungo/rafforzo il refresh automatico anche per la query pagamenti quando cambia `iscrizioni` o `pagamenti`, così la pagina non può mantenere card vecchie dopo una cancellazione.

## File da modificare

- `src/pages/TurnoPage.tsx`
- probabilmente `src/hooks/usePagamenti.ts` oppure `src/pages/GestionePagamenti.tsx`, a seconda di dove conviene agganciare il refresh realtime dei pagamenti

## Risultato atteso

Dopo la modifica:

- l’Appello mostra sempre solo le iscrizioni ancora presenti nel database
- se una iscrizione viene cancellata dal database, sparisce automaticamente dalla pagina `/turno`
- i conteggi dell’Appello si riallineano automaticamente
- Gestione Pagamenti non mantiene card obsolete
- il badge `DOPPIONE` continuerà a comparire solo se nel database esistono davvero due iscrizioni uguali nello stesso turno