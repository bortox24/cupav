
-- Allow admins to update any profile (needed for activating/deactivating users)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
