ALTER TABLE public.anagrafica_invio_logs
  ADD COLUMN IF NOT EXISTS iscrizione_montaggio_id uuid
  REFERENCES public.iscrizioni_montaggio(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_anagrafica_invio_logs_montaggio
  ON public.anagrafica_invio_logs(iscrizione_montaggio_id);