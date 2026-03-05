

## Piano: Pulsante "Conferma Preiscrizione" in Anagrafica Ragazzi

### Cosa viene fatto

Aggiungere un pulsante "Conferma Preiscrizione" accanto a "Invia Iscrizione" nelle card dei ragazzi. Il pulsante chiama un webhook dedicato e registra l'esito nei log. "Invia Iscrizione" resta disabilitato finche non c'e una conferma preiscrizione riuscita.

### Modifiche al database

**Migrazione: aggiungere colonna `tipo` alla tabella `anagrafica_invio_logs`**

```sql
ALTER TABLE public.anagrafica_invio_logs
  ADD COLUMN tipo text NOT NULL DEFAULT 'invio_iscrizione';
```

Questo permette di distinguere i log di tipo `conferma_preiscrizione` da quelli di tipo `invio_iscrizione`, senza creare una nuova tabella.

### Configurazione webhook

L'utente dovra aggiungere una riga nella tabella `webhook_config` con descrizione contenente "conferma preiscrizione" e il relativo URL webhook.

### Modifiche al codice (`src/pages/AnagraficaRagazzi.tsx`)

1. **Layout pulsanti**: Sostituire il pulsante singolo "Invia iscrizione" con una riga flex contenente:
   - A sinistra: "Conferma Preiscrizione" (verde/emerald)
   - A destra: "Invia Iscrizione" (blu/indigo, come ora)

2. **Logica "Conferma Preiscrizione"**:
   - Cerca webhook_url da `webhook_config` con descrizione contenente "conferma preiscrizione"
   - Invia POST con i dati del ragazzo
   - Registra il log in `anagrafica_invio_logs` con `tipo = 'conferma_preiscrizione'`
   - Toast di conferma/errore

3. **Disabilitazione "Invia Iscrizione"**:
   - Calcolare dai `invioLogs` se esiste almeno un log con `tipo = 'conferma_preiscrizione'` e `successo = true`
   - Se non esiste, il pulsante "Invia Iscrizione" e disabilitato

4. **Conferma dialog**: Anche "Conferma Preiscrizione" avra un AlertDialog di conferma prima dell'invio

5. **Log section**: I log mostreranno il tipo (conferma vs invio) con etichette distinte

### File modificati
- `src/pages/AnagraficaRagazzi.tsx`
- Migrazione SQL per la colonna `tipo`

