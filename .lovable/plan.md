# Fix invio "Giornata Genitori" — AbortError su mobile

## Diagnosi
- La tabella `giornata_genitori` riceve correttamente gli invii (43 righe, due salvate oggi). Quindi **non** è un problema di database, permessi o RLS.
- L'errore mostrato (`AbortError: signal is aborted without reason`) significa che **il browser ha annullato la richiesta di rete** prima che completasse. Su iPhone/Safari e nelle PWA questo capita per rete instabile, schermo che si spegne, app messa in background, oppure interferenza del service worker. È intermittente: per questo alcuni genitori riescono a inviare e altri no.

## Obiettivo
Far sì che l'invio non fallisca per un'interruzione temporanea, riprovando in automatico e mostrando un messaggio chiaro solo se proprio non riesce.

## Interventi (solo `src/pages/public/GiornataGenitori.tsx`)
1. **Retry automatico** nella funzione `handleSubmit`: se l'insert fallisce con un `AbortError` (o errore di rete tipo "Failed to fetch"), riprovare automaticamente fino a 3 volte con una breve pausa crescente (es. 800ms, 1.6s) prima di mostrare l'errore.
2. **Riconoscere l'AbortError**: distinguere l'AbortError/errore di rete dai veri errori del database, così da riprovare solo quando ha senso.
3. **Messaggio d'errore più chiaro**: se dopo i tentativi fallisce ancora, mostrare un toast comprensibile ("Connessione interrotta, riprova") invece del messaggio tecnico `AbortError`.
4. **Evitare doppio invio**: mantenere il pulsante disabilitato durante i tentativi (già presente `submitting`), così i retry non generano righe duplicate.

## Note tecniche
- Nessuna modifica al database o alle policy: sono già corrette.
- L'insert resta lato client con `supabase.from("giornata_genitori").insert(...)`; aggiungiamo solo il ciclo di retry e la gestione dell'errore.
- Se dopo questo intervento l'errore dovesse ripresentarsi spesso, valuteremo come passo successivo lo spostamento dell'invio su una Edge Function (più resistente alle interruzioni del browser), ma è un'aggiunta non necessaria per ora.
