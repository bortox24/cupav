

## Piano: Unificare Gestione Utenti + Permessi + Account Staff

### Situazione attuale
- **AdminPermessi** (`/admin/permessi`): tabella utenti con creazione, toggle admin/attivo, eliminazione
- **AdminPermessiPagine** (`/admin/permessi-pagine`): matrice checkbox pagine/turni per utente
- Gli account staff creati da Anagrafica Animatori generano password monouso (mostrate una volta e mai salvate)

### Cosa cambia

Una sola pagina `/admin/permessi` con **3 tab**:

1. **Gestione Utenti** — contenuto attuale di AdminPermessi (lista, creazione, toggle admin/attivo, elimina)
2. **Permessi Pagine** — contenuto attuale di AdminPermessiPagine (matrice checkbox pagine + turni)
3. **Account Staff** — nuova sezione che mostra gli account creati dall'Anagrafica Staff con nome, email e password

### Dettaglio "Account Staff"

Per poter mostrare le password anche successivamente, serve salvarle al momento della creazione. Verrà creata una tabella `staff_accounts` con:
- `animatore_id`, `user_id`, `email`, `full_name`, `generated_password`, `created_at`

L'edge function `create-staff-account` verrà aggiornata per salvare la password generata in questa tabella.

La tab mostrerà una tabella con: **Nome Staff**, **Email**, **Password** (con bottone copia), **Data creazione**. Solo gli admin potranno leggere questa tabella (RLS).

Inoltre verrà aggiunta la possibilità di **resettare la password** generandone una nuova (via edge function) per i casi in cui la password sia stata persa.

### Modifiche tecniche

| Area | Dettaglio |
|------|-----------|
| **DB** | Nuova tabella `staff_accounts` con RLS solo admin SELECT |
| **Edge Function** | `create-staff-account` salva anche in `staff_accounts` |
| **Nuova pagina** | `AdminPermessi.tsx` riscritta con Tabs (3 tab) |
| **Rimossa** | `AdminPermessiPagine.tsx` eliminata |
| **Routing** | `/admin/permessi-pagine` redirect a `/admin/permessi`, route rimossa |
| **Navigazione** | Home e `usePagePermissions` aggiornati: una sola voce "Gestione Utenti & Permessi" |
| **Hook** | Nuovo `useStaffAccounts.ts` per fetch da `staff_accounts` |

### Flusso password

```text
Anagrafica Staff → "Crea Account" 
  → Edge Function genera password
  → Salva in staff_accounts (plaintext, solo admin)
  → Mostra password all'utente
  
Admin → Tab "Account Staff"
  → Vede lista account con password copiabili
  → Può resettare password (nuova generazione + update)
```

