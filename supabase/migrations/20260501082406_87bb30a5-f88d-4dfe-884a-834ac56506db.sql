
-- ===== iscrizioni_famiglie =====
CREATE TABLE public.iscrizioni_famiglie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Sezione 1: dati personali
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  residente_a TEXT NOT NULL,
  via TEXT NOT NULL,
  recapiti_telefonici JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Sezione 2: iscrizione
  tipo_periodo TEXT NOT NULL, -- '7_giorni' | '10_giorni' | '15_giorni' | 'personalizzato'
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  -- Sezione 2: partecipanti
  num_adulti INTEGER NOT NULL DEFAULT 0,
  figlio_1_over10 BOOLEAN NOT NULL DEFAULT false,
  figlio_2_over10 BOOLEAN NOT NULL DEFAULT false,
  figlio_3_over10 BOOLEAN NOT NULL DEFAULT false,
  num_4_10_anni INTEGER NOT NULL DEFAULT 0,
  num_0_3_anni INTEGER NOT NULL DEFAULT 0,
  num_animali INTEGER NOT NULL DEFAULT 0,
  -- Sezione 3: acconto/firma
  acconto_versato NUMERIC(10,2) NOT NULL DEFAULT 0,
  regolamento_accettato BOOLEAN NOT NULL DEFAULT false,
  firma_data DATE NOT NULL,
  firma_nome_cognome TEXT NOT NULL,
  turno TEXT NOT NULL DEFAULT 'Turno famiglie'
);

ALTER TABLE public.iscrizioni_famiglie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert iscrizioni_famiglie"
  ON public.iscrizioni_famiglie FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated can select iscrizioni_famiglie"
  ON public.iscrizioni_famiglie FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update iscrizioni_famiglie"
  ON public.iscrizioni_famiglie FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete iscrizioni_famiglie"
  ON public.iscrizioni_famiglie FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ===== pagamenti_famiglie =====
CREATE TABLE public.pagamenti_famiglie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iscrizione_id UUID NOT NULL,
  stato payment_status NOT NULL DEFAULT 'da_pagare',
  importo_dovuto NUMERIC(10,2), -- nullable: assegnato dallo staff
  importo_pagato NUMERIC(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamenti_famiglie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or permitted users can select pagamenti_famiglie"
  ON public.pagamenti_famiglie FOR SELECT TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

CREATE POLICY "Admin or permitted users can insert pagamenti_famiglie"
  ON public.pagamenti_famiglie FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

CREATE POLICY "Admin or permitted users can update pagamenti_famiglie"
  ON public.pagamenti_famiglie FOR UPDATE TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

CREATE POLICY "Admin or permitted users can delete pagamenti_famiglie"
  ON public.pagamenti_famiglie FOR DELETE TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

CREATE TRIGGER update_pagamenti_famiglie_updated_at
  BEFORE UPDATE ON public.pagamenti_famiglie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pagamenti_famiglie_iscrizione ON public.pagamenti_famiglie(iscrizione_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.iscrizioni_famiglie;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamenti_famiglie;
