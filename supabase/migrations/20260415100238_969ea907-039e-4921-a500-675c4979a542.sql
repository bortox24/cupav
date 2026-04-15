CREATE POLICY "Anyone can insert animatori_turni"
ON public.animatori_turni
FOR INSERT
TO anon, authenticated
WITH CHECK (true);