CREATE TABLE public.tende (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno text NOT NULL,
  riga integer NOT NULL,
  numero integer NOT NULL,
  colore text NOT NULL DEFAULT 'grigio',
  assegnati jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(turno, riga, numero)
);

ALTER TABLE public.tende ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select tende" ON public.tende
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tende" ON public.tende
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update tende" ON public.tende
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete tende" ON public.tende
  FOR DELETE TO authenticated USING (true);