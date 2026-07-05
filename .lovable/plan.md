# Account Staff: turni assegnati + Disattiva/Riattiva

Modifiche alla tab **Account Staff** in `/admin/permessi` (`src/pages/AdminPermessi.tsx`, componente `AccountStaffTab`).

## 1. Mostrare i turni assegnati
Per ogni account staff mostro i turni assegnati alla persona, gli stessi che compaiono in `/anagrafica-animatori` (tabella `animatori_turni`, anno corrente 2026), abbinati tramite `animatore_id` già presente in `staff_accounts`.

- Estendo `useStaffAccounts` (`src/hooks/useStaffAccounts.ts`) per recuperare anche:
  - i turni dell'anno corrente da `animatori_turni` (via `animatore_id`);
  - lo stato `is_active` da `profiles` (via `user_id`).
- Aggiungo in tabella una colonna **"Turni"** che mostra i turni come badge (es. "4^ Elementare", "5^ Elementare"). Se nessun turno è assegnato mostro "Nessun turno".

## 2. Azione Disattiva / Riattiva
Di fianco al pulsante **Reset**, nella colonna Azioni, aggiungo un pulsante **Disattiva** (o **Riattiva** se già disattivato).

- Riuso la logica esistente `useToggleActive` (aggiorna `profiles.is_active`), che è già applicata in `ProtectedRoute`: un account disattivato non può più accedere alla piattaforma (viene mostrata la schermata "Account disattivato" e può solo uscire).
- Click su **Disattiva** → dialog di conferma → imposta `is_active = false`.
- Click su **Riattiva** → dialog di conferma → imposta `is_active = true`, la persona può rientrare con le stesse credenziali.
- Aggiungo una colonna **"Stato"** con badge verde "Attivo" / rosso "Disattivato".
- Il pulsante Disattiva è in stile distruttivo; Riattiva in stile normale/verde.

## 3. Default: tutti attivi
`profiles.is_active` è già `true` di default, quindi tutti gli account esistenti risultano **Attivi** senza alcun intervento — nessuna migrazione dati necessaria.

## Note tecniche
- Nessuna modifica al database: `is_active` e `animatori_turni` esistono già.
- La colonna turni riusa la costante anno corrente (2026) coerente con `/anagrafica-animatori`.
- Invalidazione query: dopo toggle attivo invalido `['staff-accounts']` (e le query utenti già invalidate da `useToggleActive`).
- La tab Account Staff è già accessibile solo agli admin dalla pagina `/admin/permessi`.
