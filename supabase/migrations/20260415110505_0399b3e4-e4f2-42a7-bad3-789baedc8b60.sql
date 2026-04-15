CREATE POLICY "Anyone can insert staff_activity_logs"
ON public.staff_activity_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);