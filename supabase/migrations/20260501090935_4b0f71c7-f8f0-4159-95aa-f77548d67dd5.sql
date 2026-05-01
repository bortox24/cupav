DROP POLICY IF EXISTS "Admin or turno-permitted can select iscrizioni_famiglie" ON public.iscrizioni_famiglie;
DROP POLICY IF EXISTS "Admin or turno-permitted can update iscrizioni_famiglie" ON public.iscrizioni_famiglie;
DROP POLICY IF EXISTS "Admin or turno-permitted can delete iscrizioni_famiglie" ON public.iscrizioni_famiglie;

CREATE POLICY "Admin or permitted can select iscrizioni_famiglie"
ON public.iscrizioni_famiglie FOR SELECT TO authenticated
USING (is_admin() OR has_turno_access(auth.uid(), 'Turno famiglie') OR has_page_access(auth.uid(), '/anagrafica-turno-famiglie'));

CREATE POLICY "Admin or permitted can update iscrizioni_famiglie"
ON public.iscrizioni_famiglie FOR UPDATE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-turno-famiglie'));

CREATE POLICY "Admin or permitted can delete iscrizioni_famiglie"
ON public.iscrizioni_famiglie FOR DELETE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-turno-famiglie'));