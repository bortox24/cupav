CREATE TABLE public.giornata_genitori (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  genitore_nome text NOT NULL,
  genitore_cognome text NOT NULL,
  genitore_email text NOT NULL,
  figlio_nome text NOT NULL,
  figlio_cognome text NOT NULL,
  turno text NOT NULL,
  partecipa boolean NOT NULL DEFAULT false,
  num_adulti integer NOT NULL DEFAULT 0,
  num_minori integer NOT NULL DEFAULT 0,
  contributo integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.giornata_genitori TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.giornata_genitori TO authenticated;
GRANT ALL ON public.giornata_genitori TO service_role;

ALTER TABLE public.giornata_genitori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit giornata genitori"
  ON public.giornata_genitori FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can view giornata genitori"
  ON public.giornata_genitori FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update giornata genitori"
  ON public.giornata_genitori FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete giornata genitori"
  ON public.giornata_genitori FOR DELETE TO authenticated
  USING (true);

CREATE TRIGGER update_giornata_genitori_updated_at
  BEFORE UPDATE ON public.giornata_genitori
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();