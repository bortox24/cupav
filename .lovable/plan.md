

## Piano: Conferma prima di inviare iscrizione

### Cosa viene fatto

Aggiungere un `AlertDialog` di conferma quando l'utente preme "Invia iscrizione". Il dialog chiederà "Sei sicuro di voler inviare l'iscrizione?" con due pulsanti: "Annulla" e "Conferma invio". Solo dopo la conferma verrà eseguita la chiamata webhook.

### Implementazione

**Modifica a `src/pages/AnagraficaRagazzi.tsx`:**

1. Aggiungere uno stato `confirmInvio` (boolean) per controllare l'apertura del dialog
2. Il pulsante "Invia iscrizione" ora setta `confirmInvio = true` invece di chiamare direttamente `handleInviaIscrizione`
3. Inserire un `AlertDialog` con:
   - Titolo: "Conferma invio iscrizione"
   - Descrizione: "Sei sicuro di voler inviare l'iscrizione di [nome ragazzo]?"
   - Azione "Conferma invio" → chiama `handleInviaIscrizione` e chiude il dialog
   - Azione "Annulla" → chiude il dialog

Il componente `AlertDialog` è già disponibile nel progetto (`src/components/ui/alert-dialog.tsx`).

