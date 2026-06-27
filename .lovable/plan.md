# Campo "Note" sulle card dei ragazzi

Aggiungere un campo **Note** in ogni card di iscrizione (dettaglio ragazzo) all'interno della pagina del turno. Serve per annotare cose dette dai genitori alla partenza. È **visibile a tutti** quelli che fanno parte del turno; è **modificabile solo** da cuochi, responsabili campo, responsabili animatori e dagli account "veri" (login admin/utenti, non gli account animatore).

## Comportamento

- Nel drawer di dettaglio del ragazzo, sotto la sezione "Altro" (sotto la Firma), compare un blocco **Note**.
- In sola visualizzazione mostra il testo della nota (o "Nessuna nota" se vuoto). Visibile a chiunque acceda al turno, compresi gli animatori.
- Accanto al campo Note compare una **pennetta (icona matita)** solo per i ruoli abilitati. Cliccandola il campo diventa una textarea con pulsanti Salva / Annulla.
- Ruoli che possono scrivere:
  - account "veri" con login (admin e utenti normali non-staff)
  - account staff con ruolo `cuoco`, `responsabile_campo`, `responsabile_animatori`
  - **esclusi** gli account staff con ruolo `animatore` (solo lettura)
- Il salvataggio aggiorna in tempo reale (l'app già ha il realtime sulle iscrizioni), quindi tutti vedono subito la nota.

## Dettagli tecnici

**Database (migrazione)**
- Aggiungere la colonna `note text` (nullable) alla tabella `iscrizioni`.
- Aggiungere una nuova policy di UPDATE su `iscrizioni` che consenta la modifica a chi ha accesso al turno ed è abilitato:
  - `is_admin()`, oppure
  - utente con login non-staff (`NOT is_staff_account()`) che ha `has_turno_access(auth.uid(), turno)`, oppure
  - account staff con `my_staff_ruolo()` in (`cuoco`, `responsabile_campo`, `responsabile_animatori`) e `has_turno_access(auth.uid(), turno)`.
- La policy di UPDATE esistente (admin / page-access a `/anagrafica-ragazzi`) resta invariata.

Nota: la regola RLS agisce a livello di riga, non di singola colonna; la UI di questi ruoli espone solo la modifica della nota, quindi nella pratica viene scritta solo `note`.

**Frontend (`src/pages/TurnoPage.tsx`)**
- `RagazzoDetailDrawer`: aggiungere il blocco Note sotto la Firma, con stato locale di editing, textarea e pulsanti Salva/Annulla; passare al drawer un flag `canEditNote` e una callback di salvataggio (`update` su `iscrizioni` per `id`).
- Calcolare `canEditNote = !isAnimatoreLimitato` (coerente con la logica di permessi già presente: gli animatori-staff restano in sola lettura, tutti gli altri ruoli/login possono scrivere).
- Includere `note` nella query `turno-iscrizioni` (già `select('*')`, quindi nessuna modifica alla select) e invalidare/refetch dopo il salvataggio.
- Aggiornare `src/integrations/supabase/types.ts` con la nuova colonna `note`.
