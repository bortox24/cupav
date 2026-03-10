

## Piano: Rimuovere "Conferma Preiscrizione" dall'Anagrafica Ragazzi

### Cosa cambia

Il pulsante "Conferma Preiscrizione" viene rimosso. Il pulsante "Invia Iscrizione" diventa sempre cliccabile (senza più richiedere una conferma preiscrizione precedente). Si rimuove anche il dialog di conferma preiscrizione e tutto lo stato associato.

### Modifiche in `src/pages/AnagraficaRagazzi.tsx`

1. **Rimuovere stato e funzioni**:
   - Rimuovere `sendingConferma`, `confirmConferma` (useState)
   - Rimuovere `handleConfermaPreiscrizione`
   - Semplificare `handleWebhookCall` per non gestire più il tipo `conferma_preiscrizione` (rimuovere il ternario su `setSending`)

2. **Rimuovere il pulsante "Conferma Preiscrizione"** (riga ~421-424)

3. **Sbloccare "Invia Iscrizione"**: rimuovere la condizione `disabled` che controlla la presenza di log `conferma_preiscrizione` (riga 427). Il pulsante sarà disabilitato solo durante l'invio (`sendingWebhook`).

4. **Rimuovere l'AlertDialog di conferma preiscrizione** (righe 690-705)

5. **Log rendering**: i log `conferma_preiscrizione` esistenti nel database restano visibili (non si toccano), quindi il rendering nel log continuerà a mostrare eventuali vecchi log di conferma con badge verde.

### Nessuna modifica al database
I webhook e i log esistenti non vengono toccati. Il webhook "conferma preiscrizione" nella tabella `webhook_config` può restare (non viene più invocato dal codice).

