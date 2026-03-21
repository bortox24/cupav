

## Piano: Log errore creazione account staff

### Cosa fare
Aggiungere un log nella tabella `staff_activity_logs` anche quando la creazione dell'account fallisce, con azione `account_errore` e il messaggio di errore come dettaglio.

### Modifica in `src/pages/AnagraficaAnimatori.tsx`

Nel blocco `catch` di `handleCreateAccount` (riga ~286-289), aggiungere una chiamata a `insertLog` dopo aver impostato l'errore:

```typescript
catch (err: any) {
  const msg = err?.message || 'Errore nella creazione account';
  setAccountError(msg);
  toast.error(msg);
  insertLog('account_errore', `Email: ${animatore.email} — ${msg}`);
}
```

### Log rendering
Aggiungere un badge per `account_errore` nel rendering dei log staff (badge rosso "Errore Account") se non già presente.

### Nessuna modifica al database
La tabella `staff_activity_logs` ha già la colonna `dettaglio` e il campo `azione` è testo libero.

