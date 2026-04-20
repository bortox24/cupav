DROP POLICY IF EXISTS "Admin can update tende" ON public.tende;
DROP POLICY IF EXISTS "Admin can delete tende" ON public.tende;
DROP POLICY IF EXISTS "Authenticated can insert tende" ON public.tende;

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