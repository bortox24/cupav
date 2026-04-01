
-- Remove dangerous anon SELECT/UPDATE policies

-- ragazzi: remove anon select
DROP POLICY IF EXISTS "Anon can select ragazzi for duplicate check" ON public.ragazzi;

-- ragazzi_genitori: remove anon select and update
DROP POLICY IF EXISTS "Anon can select genitori" ON public.ragazzi_genitori;
DROP POLICY IF EXISTS "Anon can update genitori" ON public.ragazzi_genitori;

-- ragazzi_iscrizioni: remove anon select and anyone update
DROP POLICY IF EXISTS "Anon can select iscrizioni" ON public.ragazzi_iscrizioni;
DROP POLICY IF EXISTS "Anyone can update iscrizioni" ON public.ragazzi_iscrizioni;

-- tende: restrict DELETE and UPDATE to admin only
DROP POLICY IF EXISTS "Authenticated can delete tende" ON public.tende;
DROP POLICY IF EXISTS "Authenticated can update tende" ON public.tende;

CREATE POLICY "Admin can delete tende" ON public.tende
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "Admin can update tende" ON public.tende
  FOR UPDATE TO authenticated USING (is_admin());
