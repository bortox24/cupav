# Festa Campeggio: filtro "Da arrivare" + check-in in tempo reale

## Problema attuale
La pagina `/festa-campeggio-iscrizioni` ha già un codice di sottoscrizione realtime, ma la tabella `festa_campeggio` **non è inclusa nella pubblicazione realtime** del database (verificato: la pubblicazione contiene solo iscrizioni, appello_logs, animatori, animatori_turni, iscrizioni_famiglie, pagamenti_famiglie, invio_massivo_jobs/items). Quindi oggi nessun aggiornamento arriva agli altri dispositivi: serve un refresh manuale.

## Cosa faremo

### 1. Realtime reale
- Aggiungere `festa_campeggio` alla pubblicazione realtime e impostare `REPLICA IDENTITY FULL` sulla tabella.
- Così due computer/account diversi vedono lo stesso stato immediatamente: quando uno segna "Arrivato", la persona sparisce dalla lista "Da arrivare" dell'altro senza ricaricare.
- Piccolo indicatore "In tempo reale" (pallino verde) nella toolbar quando il canale è connesso.

### 2. Nuovo filtro "Da arrivare"
- Nuova tab accanto a Tutte / Arrivati / Pagati: **Da arrivare (n)**, con conteggio persone (non solo adesioni).
- Ordinamento della tab per cognome, e le righe scompaiono in tempo reale appena vengono segnate arrivate.
- Le tab mostrano anche il numero di persone coinvolte, non solo il numero di adesioni.

### 3. Modalità Check-in (semplice, per operatori)
Un pulsante "Modalità Check-in" apre una vista dedicata pensata per il telefono all'ingresso:
- Campo di ricerca grande sempre a fuoco (nome, cognome, telefono, email).
- Lista compatta con solo: nome, numero persone, contributo, allergie, e un unico grande pulsante **Check-in**.
- Un tap segna arrivato + registra chi lo ha fatto (`arrivato_da`) e quando; toast di conferma con il totale da incassare per quella famiglia e un secondo pulsante rapido "Segna pagato".
- Contatore fisso in alto: persone arrivate / persone previste, e importo incassato.
- Toggle per mostrare solo chi deve ancora arrivare (attivo per default), così la lista si svuota man mano.
- Undo immediato in caso di errore (annulla arrivo).

Più operatori possono lavorare contemporaneamente: grazie al realtime nessuno fa il check-in due volte, e ogni riga mostra "arrivato da <nome operatore>".

## Idee opzionali per il futuro (non incluse ora)
- QR code personale inviato per email al momento dell'iscrizione, scansionato all'ingresso.
- Assegnazione di postazioni/turni agli operatori con log delle azioni di check-in.
- Riepilogo finale scaricabile con orari di arrivo.

## Note tecniche
- Migrazione: `ALTER PUBLICATION supabase_realtime ADD TABLE public.festa_campeggio;` + `ALTER TABLE public.festa_campeggio REPLICA IDENTITY FULL;`
- `src/hooks/useFestaCampeggio.ts`: esporre lo stato di connessione del canale; aggiornamento ottimistico su toggle arrivato/pagato.
- `src/pages/FestaCampeggioIscrizioni.tsx`: nuova tab "Da arrivare" + nuovo componente `CheckInMode` (dialog fullscreen).
