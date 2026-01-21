-- Add is_active column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM profiles WHERE id = auth.uid()),
    false
  )
$$;