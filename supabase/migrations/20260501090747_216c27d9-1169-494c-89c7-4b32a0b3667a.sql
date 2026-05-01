-- Restringi accesso iscrizioni_famiglie a admin o utenti con permesso turno "Turno famiglie"
DROP POLICY IF EXISTS "Authenticated can select iscrizioni_famiglie" ON public.iscrizioni_famiglie;
DROP POLICY IF EXISTS "Authenticated can update iscrizioni_famiglie" ON public.iscrizioni_famiglie;
DROP POLICY IF EXISTS "Authenticated can delete iscrizioni_famiglie" ON public.iscrizioni_famiglie;

CREATE POLICY "Admin or turno-permitted can select iscrizioni_famiglie"
ON public.iscrizioni_famiglie FOR SELECT TO authenticated
USING (is_admin() OR has_turno_access(auth.uid(), 'Turno famiglie'));

CREATE POLICY "Admin or turno-permitted can update iscrizioni_famiglie"
ON public.iscrizioni_famiglie FOR UPDATE TO authenticated
USING (is_admin() OR has_turno_access(auth.uid(), 'Turno famiglie'));

CREATE POLICY "Admin or turno-permitted can delete iscrizioni_famiglie"
ON public.iscrizioni_famiglie FOR DELETE TO authenticated
USING (is_admin() OR has_turno_access(auth.uid(), 'Turno famiglie'));