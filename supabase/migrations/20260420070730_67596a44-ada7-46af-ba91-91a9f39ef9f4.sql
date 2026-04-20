CREATE OR REPLACE FUNCTION public.has_turno_access(_user_id uuid, _turno text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.turno_permessi
    WHERE user_id = _user_id
      AND turno = _turno
  )
$$;

DROP POLICY IF EXISTS "Admin or turno-permitted users can update tende" ON public.tende;
DROP POLICY IF EXISTS "Admin or turno-permitted users can delete tende" ON public.tende;
DROP POLICY IF EXISTS "Admin or turno-permitted users can insert tende" ON public.tende;

CREATE POLICY "Admin or turno-permitted users can update tende"
ON public.tende
FOR UPDATE
TO authenticated
USING (is_admin() OR public.has_turno_access(auth.uid(), turno))
WITH CHECK (is_admin() OR public.has_turno_access(auth.uid(), turno));

CREATE POLICY "Admin or turno-permitted users can delete tende"
ON public.tende
FOR DELETE
TO authenticated
USING (is_admin() OR public.has_turno_access(auth.uid(), turno));

CREATE POLICY "Admin or turno-permitted users can insert tende"
ON public.tende
FOR INSERT
TO authenticated
WITH CHECK (is_admin() OR public.has_turno_access(auth.uid(), turno));