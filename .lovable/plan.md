

## Piano: Campi dinamici come toggle di abilitazione per l'AI

### Cosa cambia
I pulsanti dei campi dinamici nello Step 1 diventano **toggle on/off** invece di inserire testo nel textarea. Quando un campo è selezionato (attivo), l'AI potrà usare quel segnaposto nell'email generata. Se non è selezionato, l'AI non lo userà.

### Dettagli tecnici

**File**: `src/components/InvioMassivoDialog.tsx`

1. **Nuovo stato**: `selectedDynamicFields` — un `Set<string>` o array di tag attivi (es. `['{{nome_ragazzo}}', '{{turno}}']`). Di default tutti disattivati.

2. **UI toggle**: I pulsanti cambiano aspetto (es. bordo verde/evidenziato se attivo, grigio se disattivo). Click alterna lo stato.

3. **Rimuovere** la logica `insertTag` che inserisce nel textarea — non serve più.

4. **Passare i campi abilitati al prompt AI**: Nella funzione `generateEmail`, aggiungere al `body.prompt` una riga tipo:
   ```
   "Campi dinamici abilitati: {{nome_ragazzo}}, {{turno}}. Usa SOLO questi segnaposti nell'email."
   ```
   Se nessun campo è selezionato, indicare all'AI di non usare segnaposti.

5. **Aggiornare testo descrittivo**: "Seleziona i campi che l'AI potrà inserire nell'email" invece di "clicca per inserire".

### Nessuna modifica al backend
La edge function e la logica di sostituzione restano invariate.

