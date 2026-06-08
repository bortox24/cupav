CREATE OR REPLACE FUNCTION public.is_staff_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_accounts WHERE user_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_account(uuid) TO authenticated;