
-- Table for logging "Invia iscrizione" webhook calls from Anagrafica
CREATE TABLE public.anagrafica_invio_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ragazzo_id uuid NOT NULL REFERENCES public.ragazzi(id) ON DELETE CASCADE,
  inviato_da uuid NOT NULL,
  inviato_da_nome text NOT NULL,
  successo boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.anagrafica_invio_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select anagrafica_invio_logs"
  ON public.anagrafica_invio_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert anagrafica_invio_logs"
  ON public.anagrafica_invio_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
