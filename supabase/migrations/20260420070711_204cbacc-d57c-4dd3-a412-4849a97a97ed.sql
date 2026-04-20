DROP POLICY IF EXISTS "Admin or permitted users can update tende" ON public.tende;
DROP POLICY IF EXISTS "Admin or permitted users can delete tende" ON public.tende;
DROP POLICY IF EXISTS "Admin or permitted users can insert tende" ON public.tende;

CREATE POLICY "Admin or turno-permitted users can update tende"
ON public.tende
FOR UPDATE
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.turno_permessi tp
    WHERE tp.user_id = auth.uid()
      AND tp.turno = public.tende.turno
  )
)
WITH CHECK (
  is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.turno_permessi tp
    WHERE tp.user_id = auth.uid()
      AND tp.turno = public.tende.turno
  )
);

CREATE POLICY "Admin or turno-permitted users can delete tende"
ON public.tende
FOR DELETE
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.turno_permessi tp
    WHERE tp.user_id = auth.uid()
      AND tp.turno = public.tende.turno
  )
);

CREATE POLICY "Admin or turno-permitted users can insert tende"
ON public.tende
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.turno_permessi tp
    WHERE tp.user_id = auth.uid()
      AND tp.turno = public.tende.turno
  )
);