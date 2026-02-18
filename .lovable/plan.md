
# Fix per 3 problemi riscontrati nel beta test

## Problema 1: Moduli inattivi non visibili in "Visualizza Moduli"

**Causa**: La policy RLS sulla tabella `forms` consente ai non-admin di vedere solo i moduli attivi (`is_active = true`). Gli utenti con permesso sulla pagina non vedono quelli disattivati.

**Soluzione**: Aggiungere una policy RLS che permetta agli utenti con permesso sulla pagina `/visualizza-moduli` di vedere TUTTI i moduli (attivi e inattivi).

---

## Problema 2: Utenti con accesso a "Gestione Moduli" non possono modificare/creare moduli

**Causa**: Le policy RLS su `forms` e `form_responses` concedono operazioni di scrittura solo agli admin (`is_admin()`).

**Soluzione**: Aggiungere policy RLS che permettano agli utenti con permesso sulla pagina `/admin/moduli` di:
- Vedere tutti i moduli (inclusi inattivi)
- Creare, modificare ed eliminare moduli
- Vedere e eliminare risposte dei moduli

---

## Problema 3: Errore "no unique or exclusion constraint matching the ON CONFLICT specification"

**Causa**: Nel codice `useToggleAdmin`, l'upsert usa `onConflict: 'user_id'`, ma il vincolo unico sulla tabella `user_roles` e' su `(user_id, role)`, non su `user_id` da solo.

**Soluzione**: Modificare il codice per usare un semplice `insert` invece di `upsert`, dato che prima di inserire si potrebbe gia' verificare se il ruolo esiste, oppure usare `onConflict: 'user_id,role'`.

---

## Dettagli tecnici

### Migrazione database (SQL)

Creazione di una funzione helper `has_page_access` per controllare i permessi pagina nelle policy RLS:

```text
CREATE OR REPLACE FUNCTION public.has_page_access(_user_id uuid, _page_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_page_permissions
    WHERE user_id = _user_id
      AND page_path = _page_path
      AND can_access = true
  )
$$;
```

Nuove policy per la tabella `forms`:

```text
-- Utenti con permesso /visualizza-moduli vedono tutti i moduli
CREATE POLICY "Users with visualizza-moduli access can view all forms"
ON public.forms FOR SELECT TO authenticated
USING (has_page_access(auth.uid(), '/visualizza-moduli'));

-- Utenti con permesso /admin/moduli possono gestire i moduli
CREATE POLICY "Users with admin-moduli access can manage forms"
ON public.forms FOR ALL TO authenticated
USING (has_page_access(auth.uid(), '/admin/moduli'))
WITH CHECK (has_page_access(auth.uid(), '/admin/moduli'));
```

Nuove policy per la tabella `form_responses`:

```text
-- Utenti con permesso /admin/moduli possono vedere le risposte
CREATE POLICY "Users with admin-moduli access can view responses"
ON public.form_responses FOR SELECT TO authenticated
USING (has_page_access(auth.uid(), '/admin/moduli'));

-- Utenti con permesso /admin/moduli possono eliminare le risposte
CREATE POLICY "Users with admin-moduli access can delete responses"
ON public.form_responses FOR DELETE TO authenticated
USING (has_page_access(auth.uid(), '/admin/moduli'));
```

### Modifica codice: `src/hooks/useUsers.ts`

Nella funzione `useToggleAdmin`, sostituire l'upsert con insert semplice:

```text
// Prima (errore):
const { error } = await supabase
  .from('user_roles')
  .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });

// Dopo (corretto):
const { error } = await supabase
  .from('user_roles')
  .insert({ user_id: userId, role: 'admin' as const });
```

### Riepilogo modifiche

| File / Risorsa | Tipo modifica |
|---|---|
| Migrazione DB | Nuova funzione `has_page_access` + 4 nuove policy RLS |
| `src/hooks/useUsers.ts` | Fix upsert -> insert nel toggle admin |
