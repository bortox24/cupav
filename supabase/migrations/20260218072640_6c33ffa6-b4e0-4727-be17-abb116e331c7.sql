
-- Helper function to check page access
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

-- Users with /visualizza-moduli permission can view ALL forms
CREATE POLICY "Users with visualizza-moduli access can view all forms"
ON public.forms FOR SELECT TO authenticated
USING (has_page_access(auth.uid(), '/visualizza-moduli'));

-- Users with /admin/moduli permission can fully manage forms
CREATE POLICY "Users with admin-moduli access can manage forms"
ON public.forms FOR ALL TO authenticated
USING (has_page_access(auth.uid(), '/admin/moduli'))
WITH CHECK (has_page_access(auth.uid(), '/admin/moduli'));

-- Users with /admin/moduli permission can view responses
CREATE POLICY "Users with admin-moduli access can view responses"
ON public.form_responses FOR SELECT TO authenticated
USING (has_page_access(auth.uid(), '/admin/moduli'));

-- Users with /admin/moduli permission can delete responses
CREATE POLICY "Users with admin-moduli access can delete responses"
ON public.form_responses FOR DELETE TO authenticated
USING (has_page_access(auth.uid(), '/admin/moduli'));
