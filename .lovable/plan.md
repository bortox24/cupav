

## Problema

L'errore RLS blocca la modifica delle tende perché le policy attuali permettono `UPDATE`/`DELETE` solo agli admin:

```
Admin can update tende → USING (is_admin())
Admin can delete tende → USING (is_admin())
```

Quindi qualsiasi utente non-admin (anche se ha accesso alla pagina del turno) riceve l'errore "new row violates row-level security policy".

## Soluzione

Estendere le policy RLS della tabella `tende` per permettere modifiche anche agli utenti che hanno accesso alla pagina del turno corrispondente, in linea con il pattern già usato per `animatori`, `ragazzi`, `pagamenti`.

### Modifiche al database (migrazione)

Sostituire le 3 policy restrittive con policy che includano sia admin che utenti con permesso pagina turno:

```sql
-- Drop policies esistenti
DROP POLICY "Admin can update tende" ON public.tende;
DROP POLICY "Admin can delete tende" ON public.tende;
DROP POLICY "Authenticated can insert tende" ON public.tende;

-- Nuove policy: admin OR utenti con accesso a /turno/<slug-del-turno>
CREATE POLICY "Admin or permitted users can update tende"
ON public.tende FOR UPDATE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/turno/' || turno))
WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/turno/' || turno));

CREATE POLICY "Admin or permitted users can delete tende"
ON public.tende FOR DELETE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/turno/' || turno));

CREATE POLICY "Admin or permitted users can insert tende"
ON public.tende FOR INSERT TO authenticated
WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/turno/' || turno));
```

### Verifica

Dopo la migrazione l'utente loggato (admin o con permesso al turno) potrà:
- Cambiare colore tenda
- Aggiungere/rimuovere ragazzi assegnati
- Senza più errori RLS

Nessuna modifica al codice frontend necessaria — il bug è puramente sul livello permessi del database.

