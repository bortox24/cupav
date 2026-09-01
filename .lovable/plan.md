# Comunicazioni per Festa Campeggio

Aggiungere un pulsante "Comunicazioni" accanto a "Scarica PDF" nella pagina Festa Campeggio iscrizioni, che apre il wizard di invio massivo già usato in Anagrafica Ragazzi, Anagrafica Staff e Anagrafica Montaggio Campeggio.

## Come funzionerà

1. Pulsante "Comunicazioni" nella toolbar, a fianco di "Scarica PDF".
2. Si apre il wizard in 3 passi già esistente:
   - Passo 1 — Messaggio: titolo, testo, pulsante finale opzionale (etichetta + link).
   - Passo 2 — Anteprima: email nel layout CUPAV standard.
   - Passo 3 — Destinatari: filtri per tipologia (adesioni con adulti, con ragazzi, con staff) più la possibilità di selezionare/deselezionare singole persone dalla lista.
3. Con "Avvia invio" le email partono in background dal server, una alla volta con cadenza di 30 secondi (stesso meccanismo webhook già in uso). La finestra si può chiudere: l'invio continua e resta monitorabile dal banner di avanzamento globale già presente nell'app.

Ogni destinatario riceve un'email personalizzata con il proprio nome; vengono incluse solo le adesioni con indirizzo email.

## Dettagli tecnici

- `src/pages/FestaCampeggioIscrizioni.tsx`: nuovo pulsante + stato dialog, costruzione della lista destinatari da `festa_campeggio` (nome/cognome, email, badge con numero adulti/ragazzi/staff, tag `tipologia` = `adulti`/`ragazzi`/`staff` in base ai conteggi > 0).
- `src/components/InvioMassivoGenericDialog.tsx`:
  - estendere `entityType` con `'festa'`;
  - aggiungere prop opzionale `allowIndividualSelection` che nello step Destinatari mostra una checkbox per ogni persona (default: tutte selezionate tra quelle che passano i filtri) con azioni "Seleziona tutti"/"Deseleziona tutti"; i `recipient_ids` inviati sono l'intersezione filtri + selezione manuale.
- `supabase/functions/invio-massivo-runner/index.ts`:
  - aggiungere `festa` a `PAGE_BY_ENTITY` con path `/festa-campeggio-iscrizioni` (controllo permessi pagina come per le altre entità);
  - accettare `entity_type: 'festa'` e caricare i destinatari da `festa_campeggio` (id, nome, cognome, email, num_adulti, num_ragazzi, num_staff, contributo, arrivato, pagato), scartando le righe senza email;
  - payload con `genitori: [{ nome_cognome, email }]` per la personalizzazione, come già fatto per montaggio;
  - il log per questa entità non ha una tabella dedicata: usare `anagrafica_invio_logs` senza `ragazzo_id`/`iscrizione_montaggio_id`, oppure saltare il log per `festa` (scelta: log saltato per non violare vincoli). Da confermare in fase di build leggendo i vincoli della tabella.
- Cadenza invio: resta 30 secondi (`interval = 30` nel runner).
- Deploy della Edge Function dopo la modifica.
