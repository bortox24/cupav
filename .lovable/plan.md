# Check-in Festa Campeggio: schermata intera e arrivi parziali

## Come sarà la nuova schermata

Il pulsante "Modalità Check-in" non apre più una finestra, ma una pagina intera con sfondo pieno (colori della festa), pensata prima di tutto per il telefono.

**Passo 1 — Ricerca**
- Solo una barra di ricerca grande al centro dello schermo, senza alcun elenco sotto.
- Appena si scrive qualcosa (nome, cognome, telefono o email) compaiono i risultati sotto la barra, massimo pochi per volta, ordinati per cognome.
- In alto, contatore sempre visibile: persone entrate / persone previste e importo incassato. Pallino verde quando l'aggiornamento in tempo reale è attivo.
- Ogni risultato mostra: cognome e nome, composizione (adulti/ragazzi/staff), quanto già entrato e quanto già pagato, eventuali allergie, e un pulsante grande "Check-in".

**Passo 2 — Chi è entrato e chi paga**
Toccando "Check-in" si passa a una seconda schermata dedicata a quella prenotazione, con due blocchi:
1. **Persone entrate ora**: uno stepper (− / numero / +) per adulti, ragazzi e staff, limitato a quanti ne restano da far entrare. Preimpostato su "tutti i restanti", con scorciatoia "Sono arrivati tutti".
2. **Pagamento**: quanto si incassa adesso. Scelte rapide: "Paga solo per chi entra ora", "Paga per tutti" (saldo completo), oppure importo libero. Si vede sempre: totale prenotazione, già incassato, residuo.

Conferma → toast di riepilogo (persone entrate, incassato ora, residuo) e ritorno alla barra di ricerca pulita, pronta per la persona successiva. Pulsante "Annulla ultimo check-in" per correggere subito un errore.

## Cosa cambia nella lista di gestione
- Ogni adesione mostra lo stato: "Entrati 3/4" e "Incassato 30/40 €".
- Le tab: "Da arrivare" include chi è entrato solo in parte; "Arrivati" solo chi è completo; "Pagati" solo chi è a saldo.
- Rimane possibile segnare tutto arrivato/pagato con un tocco dalla card, come oggi.

## Note tecniche
- Nuove colonne su `festa_campeggio`: `arrivati_adulti`, `arrivati_ragazzi`, `arrivati_staff` (int, default 0) e `importo_incassato` (numeric, default 0). Migrazione con backfill: per le righe con `arrivato = true` si impostano i valori pari alla composizione; per `pagato = true` si imposta `importo_incassato = contributo`.
- `arrivato` diventa derivato/mantenuto in sync: true quando la somma degli arrivati raggiunge il totale; `pagato` true quando `importo_incassato >= contributo`. Aggiornati insieme nella stessa mutation, così i flag esistenti (PDF, KPI, comunicazioni) continuano a funzionare.
- Nuova rotta `/festa-campeggio-checkin` (protetta con gli stessi permessi della pagina iscrizioni) senza `MainLayout`, layout full-screen; `CheckInFestaDialog.tsx` viene sostituito da `src/pages/FestaCampeggioCheckIn.tsx` con sottocomponenti per i due step.
- `useFestaCampeggio.ts`: estendere l'interfaccia con i nuovi campi; aggiornamento ottimistico già presente in `useUpdateFestaCampeggio`.
- KPI di `FestaCampeggioIscrizioni.tsx` e `exportFestaCampeggioPdf.ts` passano a somme sui nuovi campi (persone entrate reali, incassato reale) invece dei soli flag.
- Realtime già attivo sulla tabella: più operatori vedono gli arrivi parziali aggiornarsi da soli.
