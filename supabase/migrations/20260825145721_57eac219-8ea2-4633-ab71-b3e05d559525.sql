GRANT UPDATE ON public.form_responses TO authenticated;

CREATE POLICY "Admins can update responses"
ON public.form_responses FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users with admin-moduli access can update responses"
ON public.form_responses FOR UPDATE TO authenticated
USING (public.has_page_access(auth.uid(), '/admin/moduli'))
WITH CHECK (public.has_page_access(auth.uid(), '/admin/moduli'));

CREATE POLICY "Users with page permission can update responses"
ON public.form_responses FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_page_permissions upp
  WHERE upp.user_id = auth.uid() AND upp.can_access = true
    AND (upp.page_path = '/visualizza-moduli/:id/risposte' OR upp.page_path LIKE '/visualizza-moduli/%/risposte')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_page_permissions upp
  WHERE upp.user_id = auth.uid() AND upp.can_access = true
    AND (upp.page_path = '/visualizza-moduli/:id/risposte' OR upp.page_path LIKE '/visualizza-moduli/%/risposte')
));