# Modifica risposte moduli

Aggiungere la possibilità di correggere una singola risposta già inviata, dalla tabella "Tutte le Risposte" della pagina risposte modulo.

## Cosa cambia per l'utente

- In fondo a ogni riga della tabella risposte compare un'icona matita.
- Cliccandola si apre una finestra centrale con tutti i campi del modulo precompilati con i valori attuali (testo, data, numero, email, note, select/radio, checkbox).
- Si modifica quello che serve e si clicca "Salva"; la tabella, le statistiche e l'analisi AI si aggiornano subito.
- La stessa funzione viene aggiunta anche nella versione admin della pagina risposte (che oggi ha solo l'eliminazione), così le due schermate si comportano allo stesso modo.
- Possono modificare solo gli utenti che già possono vedere/gestire le risposte: amministratori e utenti con il permesso sulla pagina moduli/risposte. Gli account staff non ottengono nuovi accessi.

## Dettagli tecnici

1. **Database**: oggi `form_responses` non ha nessuna policy di UPDATE, quindi ogni modifica verrebbe rifiutata. Migrazione con policy di aggiornamento per `authenticated` allineata alle policy di lettura esistenti (`is_admin()`, `has_page_access(auth.uid(), '/admin/moduli')`, permesso `/visualizza-moduli/%/risposte`), più il GRANT UPDATE necessario.
2. **Hook** `useUpdateFormResponse` in `src/hooks/useForms.ts`: update di `data` per id, invalidazione di `['form-responses', formId]` e toast di conferma/errore.
3. **Nuovo componente** `src/components/forms/EditResponseDialog.tsx`: Dialog che genera gli input dal `form_schema` (riuso della logica di rendering dei campi già usata nel modulo pubblico), stato locale, validazione dei campi obbligatori, pulsanti Annulla/Salva con stato di caricamento.
4. **UI**: colonna azioni con pulsante matita in `src/pages/VisualizzaModuloRisposte.tsx` e in `src/pages/AdminModuloRisposte.tsx` (accanto al cestino esistente).
