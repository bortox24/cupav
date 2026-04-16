
-- Allow anonymous users to insert into animatori (public registration form)
CREATE POLICY "Anon can insert animatori"
ON public.animatori
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to insert into staff_activity_logs (registration log)
CREATE POLICY "Anon can insert staff_activity_logs"
ON public.staff_activity_logs
FOR INSERT
TO anon
WITH CHECK (true);
