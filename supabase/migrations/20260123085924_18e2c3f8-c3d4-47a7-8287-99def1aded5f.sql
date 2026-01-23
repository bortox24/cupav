-- Rimuovi la policy esistente che espone tutti i profili
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Crea nuova policy: gli utenti possono vedere solo il proprio profilo, gli admin vedono tutti
CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR is_admin());