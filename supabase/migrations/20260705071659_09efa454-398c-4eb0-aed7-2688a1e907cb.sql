CREATE OR REPLACE FUNCTION public.get_staff_role_by_user_id(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.ruolo
  FROM public.staff_accounts sa
  JOIN public.animatori a ON a.id = sa.animatore_id
  WHERE sa.user_id = _user_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_role_by_user_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_role_by_user_id(uuid) TO anon;