-- Allow turno-permitted users to read animatori_turni rows for their assigned turno
CREATE POLICY "Turno-permitted users can select animatori_turni"
ON public.animatori_turni
FOR SELECT
TO authenticated
USING (public.has_turno_access(auth.uid(), turno));

-- Allow turno-permitted users to read the animatori that belong to a turno they can access
CREATE POLICY "Turno-permitted users can select animatori"
ON public.animatori
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.animatori_turni at
    WHERE at.animatore_id = animatori.id
      AND public.has_turno_access(auth.uid(), at.turno)
  )
);