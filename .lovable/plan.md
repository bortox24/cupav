

## Piano: Selezione turno nel modulo staff con auto-assegnazione

### Cosa cambia

Il modulo staff pubblico (`/modulo-staff`) viene esteso con uno step dedicato alla **selezione del turno**. L'animatore sceglie uno o più turni (multi-select con checkbox). Alla submission, il sistema inserisce automaticamente le righe in `animatori_turni`, eliminando il lavoro manuale dello staff admin.

### Struttura del form aggiornata

```text
Step 1: Dati personali + Ruolo + Allergie (sì/no)
Step 2: Selezione turno/i (NUOVO)
  - Checkbox per ogni turno (4° Elem, 5° Elem, 1° Media, 2° Media, 3° Media)
  - Avviso di responsabilità: "La selezione del turno è definitiva e non modificabile. Seleziona il turno comunicato dallo staff animatori."
  - Checkbox di conferma obbligatorio: "Confermo che il/i turno/i selezionato/i corrisponde/ono a quanto comunicato dallo staff"
  - Almeno un turno obbligatorio
Step 3: Allergie/Patologie (solo se haAllergie = "si", altrimenti si salta)
```

### Logica di submission

1. Insert in `animatori` (come ora)
2. Recuperare l'`id` dell'animatore appena creato (aggiungere `.select('id').single()` all'insert)
3. Insert in `animatori_turni` una riga per ogni turno selezionato, con `anno = anno corrente`

Attualmente la insert in `animatori` non restituisce l'id. Va modificata per usare `.select('id').single()`.

### Policy RLS

La tabella `animatori_turni` ha già una policy `Authenticated can read animatori_turni` ma serve anche una policy **anon INSERT** perché il form è pubblico (utente non autenticato). Stessa logica della tabella `animatori` che ha già `Anyone can insert animatori`.

**Migrazione DB**: Aggiungere policy anon INSERT su `animatori_turni`.

### Visibilità turno per lo staff (permessi)

Questo punto riguarda il fatto che quando un animatore riceverà un account (tramite la funzione `create-staff-account`), avrà accesso solo ai turni assegnati. Questo è **già gestito** dal sistema `turno_permessi` esistente. Nessuna modifica necessaria qui — lo staff admin continua ad assegnare i permessi di visualizzazione tramite il sistema esistente.

La modifica dei turni da parte dello staff admin resta invariata (tramite Anagrafica Staff).

### File coinvolti

| File | Modifica |
|------|----------|
| `src/pages/public/ModuloStaff.tsx` | Nuovo step 2 con multi-select turni, riorganizzazione step numbering |
| **Migrazione DB** | Policy anon INSERT su `animatori_turni` |

### Dettagli UI (Step 2 — Selezione Turno)

- Card con titolo "🏕️ Selezione Turno"
- Lista checkbox con i 5 turni (da `TURNI` in `useTurnoPermissions.ts`)
- Alert box giallo con avviso: la scelta è definitiva, seleziona il turno comunicato dallo staff
- Checkbox di conferma responsabilità (obbligatorio per procedere)
- Validazione: almeno un turno selezionato + checkbox conferma

