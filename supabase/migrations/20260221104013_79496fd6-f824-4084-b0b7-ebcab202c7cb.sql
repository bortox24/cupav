
-- Add columns to pagamenti
ALTER TABLE public.pagamenti
  ADD COLUMN importo_dovuto integer NOT NULL DEFAULT 250,
  ADD COLUMN importo_pagato integer NOT NULL DEFAULT 0;

-- Create reminder logs table
CREATE TABLE public.pagamento_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iscrizione_id uuid NOT NULL REFERENCES public.iscrizioni(id) ON DELETE CASCADE,
  inviato_da uuid NOT NULL,
  inviato_da_nome text NOT NULL,
  stato_al_momento text NOT NULL,
  note_al_momento text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamento_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select pagamento_reminder_logs"
  ON public.pagamento_reminder_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert pagamento_reminder_logs"
  ON public.pagamento_reminder_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
