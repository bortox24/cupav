
-- 1) Restrict transactions SELECT
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions or admin/tesoriere can view all"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin() OR public.is_tesoriere());

-- 2) Restrict role_page_permissions SELECT to authenticated only
DROP POLICY IF EXISTS "Everyone can view role permissions" ON public.role_page_permissions;
CREATE POLICY "Authenticated can view role permissions"
ON public.role_page_permissions FOR SELECT
TO authenticated
USING (true);

-- 3) Remove anonymous insert policies on staff_activity_logs (auth-only policy already exists)
DROP POLICY IF EXISTS "Anon can insert staff_activity_logs" ON public.staff_activity_logs;
DROP POLICY IF EXISTS "Anyone can insert staff_activity_logs" ON public.staff_activity_logs;
