

## Piano: Eliminazione account utente da Gestione Utenti

### Obiettivo
Aggiungere un pulsante "Elimina" per ogni utente (tranne se stesso) nella tabella Gestione Utenti. L'eliminazione rimuove completamente l'account auth, permettendo di ricreare l'account dalla pagina Anagrafica Staff.

### Implementazione

#### 1. Nuova edge function `delete-user`
- Riceve `userId` nel body
- Verifica che il chiamante sia autenticato
- Usa `adminClient.auth.admin.deleteUser(userId)` per eliminare l'utente da auth
- Il profilo viene eliminato automaticamente tramite il trigger/cascade esistente (`handle_new_user` crea il profilo, e la tabella profiles ha `id` che referenzia `auth.users`)
- Pulisce anche: `user_roles`, `turno_permessi`, `user_page_permissions` per sicurezza (dato che potrebbero non avere CASCADE)
- Config: aggiungere `[functions.delete-user] verify_jwt = false` in `config.toml`

#### 2. Hook `useDeleteUser` in `useUsers.ts`
- Mutation che invoca `supabase.functions.invoke('delete-user', { body: { userId } })`
- Invalida query `['users']` on success
- Toast di conferma/errore

#### 3. UI in `AdminPermessi.tsx`
- Nuova colonna "Azioni" nella tabella
- Pulsante icona `Trash2` rosso per ogni riga (nascosto per l'utente corrente)
- Dialog di conferma con AlertDialog prima dell'eliminazione (mostra nome + email)
- Import `AlertDialog` components + `Trash2` icon

### File modificati
- `supabase/functions/delete-user/index.ts` — nuova edge function
- `supabase/config.toml` — aggiunta config
- `src/hooks/useUsers.ts` — nuovo hook `useDeleteUser`
- `src/pages/AdminPermessi.tsx` — colonna azioni + dialog conferma eliminazione

