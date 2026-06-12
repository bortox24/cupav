## Obiettivo

Quando modifichi un membro dello staff dall'Anagrafica Staff (es. da "LoBrutto Angela" a "Lo Brutto Angela"), il nome aggiornato deve riflettersi anche nell'account staff collegato — cioè quello che la persona vede dentro il proprio profilo dopo il login.

## Il problema oggi

La modifica aggiorna solo la tabella `animatori`. L'account di accesso della persona invece legge il nome da un'altra parte (la scheda profilo dell'utente, creata al momento della generazione dell'account). Quella scheda resta col vecchio nome, quindi la persona continua a vedere "LoBruttoAngela" attaccato.

## Soluzione

Quando salvi una modifica su un animatore che ha già un account staff, propaghiamo automaticamente il nome aggiornato all'account.

### Cosa viene sincronizzato
- Il nome completo (`full_name`) — è il dato visibile dopo il login.
- Manteniamo allineata anche la copia del nome salvata nell'elenco account staff.

L'aggiornamento del profilo di accesso di un altro utente richiede privilegi elevati, quindi va fatto tramite una Edge Function (con service role), non dal client.

## Passi tecnici

1. **Nuova Edge Function `sync-staff-account`**
   - Input: `animatoreId`, `fullName`.
   - Verifica che il chiamante sia admin oppure abbia accesso alla pagina `/anagrafica-animatori` (stesso controllo già usato in `create-staff-account`).
   - Trova la riga in `staff_accounts` con `animatore_id = animatoreId`. Se non esiste (l'animatore non ha account), termina senza fare nulla.
   - Con il service role:
     - aggiorna `profiles.full_name` per il `user_id` collegato;
     - aggiorna i metadati dell'utente in Auth (`user_metadata.full_name`);
     - aggiorna `staff_accounts.full_name`.

2. **Collegamento dal frontend**
   - In `useUpdateAnimatore` (o nella `onSuccess` del salvataggio in `AnagraficaAnimatori.tsx`), dopo l'update dell'animatore richiamare `supabase.functions.invoke('sync-staff-account', { body: { animatoreId, fullName } })`.
   - L'operazione è "best effort": se l'animatore non ha account, non mostra errori; in caso di errore reale logghiamo senza bloccare il salvataggio dei dati anagrafici.
   - Invalidare le query `['animatori']` e `['staff-accounts']`.

## Note
- La persona vedrà il nome aggiornato al successivo refresh/login (i dati di sessione vengono ricaricati al login).
- Sincronizziamo il nome perché è l'unico dato dell'account staff visibile dalla persona; email/telefono dell'anagrafica restano sull'anagrafica e non toccano le credenziali di accesso.
