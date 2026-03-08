

## Piano: Pagina Regolamento con upload PDF e visualizzatore inline

### Obiettivo
Creare una pagina `/regolamento` dove gli admin possono caricare un PDF del regolamento, e tutti gli utenti con permesso possono visualizzarlo direttamente nella pagina tramite un viewer integrato.

### Implementazione

#### 1. Storage bucket `regolamento`
- Creare un bucket pubblico `regolamento` via migration
- RLS: admin può upload/delete, authenticated con permesso pagina può leggere

#### 2. Nuova pagina `src/pages/Regolamento.tsx`
- Layout con `MainLayout`
- **Admin**: pulsante upload PDF (input file accept=".pdf"), pulsante elimina PDF corrente
- **Tutti**: viewer PDF inline usando `<iframe>` o `<object>` con l'URL pubblico del file dal bucket
- Il file viene salvato sempre con un nome fisso (es. `regolamento.pdf`) per semplicità, sovrascrivendo il precedente
- Usa `supabase.storage.from('regolamento')` per upload/list/getPublicUrl

#### 3. Registrare la pagina nel sistema
- **`usePagePermissions.ts`**: aggiungere `/regolamento` in `availablePages`
- **`App.tsx`**: aggiungere route protetta `/regolamento`
- **`Home.tsx`**: aggiungere card di accesso rapido "Regolamento" con icona `BookOpen`

#### 4. Migration SQL
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('regolamento', 'regolamento', true);

CREATE POLICY "Anyone authenticated can read regolamento" ON storage.objects FOR SELECT USING (bucket_id = 'regolamento' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can upload regolamento" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'regolamento' AND is_admin());
CREATE POLICY "Admins can update regolamento" ON storage.objects FOR UPDATE USING (bucket_id = 'regolamento' AND is_admin());
CREATE POLICY "Admins can delete regolamento" ON storage.objects FOR DELETE USING (bucket_id = 'regolamento' AND is_admin());
```

### File modificati
- `supabase/migrations/` — nuovo file migration per bucket + policies
- `src/pages/Regolamento.tsx` — nuova pagina
- `src/App.tsx` — route
- `src/hooks/usePagePermissions.ts` — aggiunta pagina
- `src/pages/Home.tsx` — card accesso rapido

