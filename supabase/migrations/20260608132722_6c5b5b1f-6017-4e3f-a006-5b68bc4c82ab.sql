-- Allow users with turno access to read iscrizioni for their assigned turno
CREATE POLICY "Turno-permitted users can select iscrizioni"
ON public.iscrizioni
FOR SELECT
TO authenticated
USING (public.has_turno_access(auth.uid(), turno));