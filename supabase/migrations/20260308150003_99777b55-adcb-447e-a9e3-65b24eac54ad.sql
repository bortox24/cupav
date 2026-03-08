CREATE TABLE public.staff_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animatore_id uuid NOT NULL,
  azione text NOT NULL,
  dettaglio text,
  eseguito_da uuid NOT NULL,
  eseguito_da_nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select staff_activity_logs"
  ON public.staff_activity_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert staff_activity_logs"
  ON public.staff_activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);