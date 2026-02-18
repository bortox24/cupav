
-- Create turno_permessi table
CREATE TABLE public.turno_permessi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  turno TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assegnato_da UUID,
  UNIQUE (user_id, turno)
);

-- Enable RLS
ALTER TABLE public.turno_permessi ENABLE ROW LEVEL SECURITY;

-- SELECT: user can read own rows OR admin can read all
CREATE POLICY "Users can view own turno permissions"
ON public.turno_permessi
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin());

-- INSERT: only admin
CREATE POLICY "Admins can insert turno permissions"
ON public.turno_permessi
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- DELETE: only admin
CREATE POLICY "Admins can delete turno permissions"
ON public.turno_permessi
FOR DELETE
TO authenticated
USING (is_admin());

-- Enable realtime on iscrizioni
ALTER PUBLICATION supabase_realtime ADD TABLE public.iscrizioni;
