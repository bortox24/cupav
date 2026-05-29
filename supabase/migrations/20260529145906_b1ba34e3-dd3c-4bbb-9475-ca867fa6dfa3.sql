CREATE OR REPLACE FUNCTION public.is_staff_account()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_accounts WHERE user_id = auth.uid()
  )
$$;