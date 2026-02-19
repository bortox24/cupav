CREATE TABLE public.appello_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno text NOT NULL,
  effettuato_da uuid NOT NULL,
  effettuato_da_nome text NOT NULL,
  presenti integer NOT NULL,
  totale integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appello_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select appello_logs"
  ON public.appello_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert appello_logs"
  ON public.appello_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.appello_logs;