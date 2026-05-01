ALTER TABLE public.anagrafica_invio_logs
  ALTER COLUMN ragazzo_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS iscrizione_famiglia_id uuid;

CREATE INDEX IF NOT EXISTS idx_anagrafica_invio_logs_famiglia
  ON public.anagrafica_invio_logs(iscrizione_famiglia_id);