CREATE OR REPLACE FUNCTION public.my_staff_ruolo()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.ruolo
  FROM public.staff_accounts sa
  JOIN public.animatori a ON a.id = sa.animatore_id
  WHERE sa.user_id = auth.uid()
  LIMIT 1
$$;