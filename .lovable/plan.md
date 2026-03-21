

## Piano: Ripristinare pulsante "Conferma Preiscrizione" nelle card ragazzi

### Cosa fare

Aggiungere un pulsante "Conferma Preiscrizione" nella sezione "Gestione iscrizioni" del Drawer ragazzo, sopra il pulsante "Invia Iscrizione". Il pulsante chiama un webhook con descrizione "conferma preiscrizione" dalla tabella `webhook_config` e registra un log di tipo `conferma_preiscrizione`.

### Modifiche in `src/pages/AnagraficaRagazzi.tsx`

1. **Nuovo stato**: aggiungere `sendingConferma` (boolean) e `confirmConferma` (boolean per AlertDialog)

2. **Nuova funzione `handleConfermaPreiscrizione`**: stessa struttura di `handleInviaIscrizione` ma:
   - Cerca webhook con `descrizione ilike '%conferma preiscrizione%'`
   - Invia lo stesso payload del ragazzo
   - Inserisce log con `tipo: 'conferma_preiscrizione'`
   - Toast di successo/errore

3. **UI — Pulsante** (riga ~414, prima di "Invia Iscrizione"):
   - Pulsante verde con icona Check e testo "Conferma Preiscrizione"
   - Disabilitato durante `sendingConferma`
   - Click apre AlertDialog di conferma

4. **AlertDialog di conferma**: simile a quello di "Invia Iscrizione", chiede conferma prima di procedere

5. **Log rendering** (già presente): il badge `conferma_preiscrizione` è già gestito nel rendering dei log (badge verde "Conferma")

### Nessuna modifica al database
La tabella `anagrafica_invio_logs` supporta già il tipo `conferma_preiscrizione`. Il webhook va configurato nella tabella `webhook_config` con descrizione contenente "conferma preiscrizione".

