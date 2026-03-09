

## Piano: Avviso "già preiscritto" con immagine date preiscrizioni

### Problema
Attualmente, se un ragazzo è già presente nel database, `submitPreiscrizione` aggiorna silenziosamente i dati senza avvisare il genitore. Si vuole invece mostrare un avviso specifico con un'immagine delle date di preiscrizione.

### Soluzione
Modificare il flusso in `PreiscrizioneCupav.tsx`:

1. **Pre-check prima del submit**: Prima di chiamare `submitPreiscrizione`, fare una query al database per verificare se il nome esiste già nella tabella `ragazzi` E ha un'iscrizione per l'anno corrente (2026).

2. **Stato "già preiscritto"**: Aggiungere uno stato `alreadyRegistered` che, se `true`, mostra una schermata di avviso al posto della conferma standard.

3. **Schermata avviso**: Mostrare una Card con:
   - Icona di avviso (AlertCircle)
   - Messaggio: "Tuo figlio/a è già stato/a preiscritto/a! Ricordati di presentarti in patronato la serata di preiscrizione del turno di iscrizione di tuo figlio/a."
   - Immagine `Date_preiscrizioni_CUPAV_2026.jpeg` dal bucket `immaginivarie` (URL pubblico)
   - Pulsante per tornare al form

4. **Non aggiornare i dati**: Se il ragazzo è già preiscritto per l'anno corrente, NON sovrascrivere i dati esistenti — mostrare solo l'avviso.

### Flusso
```text
Submit → Check DB (ragazzo + iscrizione anno corrente)
  ├─ Esiste → Mostra avviso "già preiscritto" + immagine date
  └─ Non esiste → Procedi con submitPreiscrizione → Mostra conferma
```

### File modificati
- `src/pages/public/PreiscrizioneCupav.tsx` — aggiungere pre-check, stato `alreadyRegistered`, e schermata avviso con immagine
- `src/hooks/useRagazzi.ts` — nessuna modifica (il check viene fatto direttamente nel componente con una query Supabase)

### Dettagli tecnici
- URL immagine: `https://lymuvosryafhpeaiqcba.supabase.co/storage/v1/object/public/immaginivarie/Date_preiscrizioni_CUPAV_2026.jpeg`
- La query di check usa le stesse tabelle `ragazzi` e `ragazzi_iscrizioni` che hanno già policy di SELECT pubblica (anon)

