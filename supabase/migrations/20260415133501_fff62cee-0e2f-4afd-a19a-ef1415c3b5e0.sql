
CREATE TABLE public.staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animatore_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  generated_password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view staff_accounts"
  ON public.staff_accounts FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update staff_accounts"
  ON public.staff_accounts FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete staff_accounts"
  ON public.staff_accounts FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can insert staff_accounts"
  ON public.staff_accounts FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE TRIGGER update_staff_accounts_updated_at
  BEFORE UPDATE ON public.staff_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
